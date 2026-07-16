from sqlalchemy.orm import Session
from src.main.models.agendamento_model import Agendamento, HistoricoAgendamento
from datetime import date, datetime, time, timedelta
from urllib.error import URLError
from urllib.request import Request as UrlRequest, urlopen
from zoneinfo import ZoneInfo

from sqlalchemy import select
from fastapi import HTTPException
from src.main.schemas.agendamento_schema import AgendamentoCreate, AgendamentoStatusUpdate
from src.main.services.disponibilidade_service import (
    adquirir_lock_prestador,
    validar_intervalo_para_criacao,
)
import pika
import json
from src.main.core.config import settings

OPEN_STATUSES = {"pendente", "confirmado"}
CANCELAMENTO_MINUTOS_LIMITE = 15
AUTO_CONCLUSAO_APOS_MINUTOS = 60


def agora_local() -> datetime:
    return datetime.now(ZoneInfo(settings.APP_TIMEZONE)).replace(tzinfo=None)


def buscar_duracao_servico(prestador_id: int, servico_id: int, headers: dict[str, str]) -> int:
    request = UrlRequest(
        f"{settings.CATALOGO_URL}/catalogo/prestadores/{prestador_id}/servicos",
        headers=headers,
    )

    try:
        with urlopen(request, timeout=5) as response:
            servicos = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Servico de Catalogo indisponivel para resolver duracao do servico: {exc}",
        )

    for servico in servicos:
        if str(servico.get("id")) == str(servico_id):
            return int(servico.get("duracao_min") or 0)

    raise HTTPException(status_code=404, detail="Servico do agendamento nao encontrado.")


def concluir_agendamentos_vencidos(
    db: Session,
    agendamentos: list[Agendamento],
    headers: dict[str, str],
) -> None:
    agora = agora_local()
    alterou = False

    for agendamento in agendamentos:
        if agendamento.status not in OPEN_STATUSES:
            continue

        duracao_min = buscar_duracao_servico(
            agendamento.prestador_id,
            agendamento.servico_id,
            headers,
        )
        limite_conclusao = agendamento.inicio + timedelta(
            minutes=duracao_min + AUTO_CONCLUSAO_APOS_MINUTOS
        )

        if agora < limite_conclusao:
            continue

        status_anterior = agendamento.status
        agendamento.status = "concluido"
        db.add(
            HistoricoAgendamento(
                agendamento_id=agendamento.id,
                usuario_id=0,
                status_anterior=status_anterior,
                status_novo="concluido",
                motivo="Concluido automaticamente apos o horario do atendimento.",
            )
        )
        alterou = True

    if alterou:
        db.commit()
        for agendamento in agendamentos:
            db.refresh(agendamento)


def validar_cancelamento(
    agendamento: Agendamento,
    motivo: str | None,
) -> str:
    if agendamento.status not in OPEN_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Apenas agendamentos em aberto podem ser cancelados.",
        )

    motivo_normalizado = (motivo or "").strip()
    if not motivo_normalizado:
        raise HTTPException(status_code=400, detail="Informe o motivo do cancelamento.")

    limite_cancelamento = agendamento.inicio - timedelta(minutes=CANCELAMENTO_MINUTOS_LIMITE)
    if agora_local() >= limite_cancelamento:
        raise HTTPException(
            status_code=409,
            detail="Este agendamento nao pode ser cancelado proximo do atendimento.",
        )

    return motivo_normalizado[:100]


def publicar_evento(agendamento: Agendamento):
    """
    Publica evento na fila RabbitMQ após agendamento criado.
    Se o RabbitMQ estiver fora, loga o erro mas não derruba o endpoint.
    """
    try:
        credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials
            )
        )
        channel = connection.channel()
        channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=json.dumps({
                "agendamento_id": agendamento.id,
                "cliente_id":     agendamento.cliente_id,
                "prestador_id":   agendamento.prestador_id,
                "servico_id":     agendamento.servico_id,
                "inicio":         agendamento.inicio.isoformat(),
            }),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"✅ Evento publicado na fila para agendamento id={agendamento.id}")
    except Exception as e:
        print(f"⚠️  Falha ao publicar no RabbitMQ: {e}")


def publicar_evento_status(
    agendamento: Agendamento,
    status_anterior: str,
    usuario_id: int,
    tipo_usuario: str,
    motivo: str = None,
):
    """Publica o evento de mudanca de status sem impedir a atualizacao no banco."""
    try:
        credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials
            )
        )
        channel = connection.channel()
        channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=json.dumps({
                "agendamento_id": agendamento.id,
                "cliente_id": agendamento.cliente_id,
                "prestador_id": agendamento.prestador_id,
                "servico_id": agendamento.servico_id,
                "inicio": agendamento.inicio.isoformat(),
                "status_anterior": status_anterior,
                "status_novo": agendamento.status,
                "alterado_por_id": usuario_id,
                "alterado_por_tipo": tipo_usuario,
                "motivo": motivo,
            }),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"✅ Evento de status publicado para agendamento id={agendamento.id}")
    except Exception as e:
        print(f"⚠️  Falha ao publicar status no RabbitMQ: {e}")


def listar_agendamentos(
    db: Session,
    usuario_id: int,
    tipo_usuario: str,
    catalogo_headers: dict[str, str],
    prestador_ids: list[int] | None = None,
    data: date | None = None,
) -> list[Agendamento]:
    query = db.query(Agendamento)

    if data:
        inicio = datetime.combine(data, time.min)
        fim = datetime.combine(data, time.max)
        query = query.filter(Agendamento.inicio >= inicio, Agendamento.inicio <= fim)

    if tipo_usuario == "admin":
        agendamentos = query.order_by(Agendamento.inicio.desc()).all()
        concluir_agendamentos_vencidos(db, agendamentos, catalogo_headers)
        return agendamentos

    if tipo_usuario == "prestador":
        if not prestador_ids:
            return []
        agendamentos = (
            query
            .filter(Agendamento.prestador_id.in_(prestador_ids))
            .order_by(Agendamento.inicio.desc())
            .all()
        )
        concluir_agendamentos_vencidos(db, agendamentos, catalogo_headers)
        return agendamentos

    agendamentos = (
        query
        .filter(Agendamento.cliente_id == usuario_id)
        .order_by(Agendamento.inicio.desc())
        .all()
    )
    concluir_agendamentos_vencidos(db, agendamentos, catalogo_headers)
    return agendamentos


def obter_agendamento(db: Session, agendamento_id: int, cliente_id: int) -> Agendamento:
    agendamento = db.query(Agendamento).filter(
        Agendamento.id == agendamento_id,
        Agendamento.cliente_id == cliente_id
    ).first()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return agendamento


def criar_agendamento(
    db: Session,
    dados: AgendamentoCreate,
    cliente_id: int,
    catalogo_headers: dict[str, str],
) -> Agendamento:
    """
    Cria agendamento com controle de concorrência via SELECT FOR UPDATE.
    Impede double booking: mesmo prestador, mesmo horário.
    """
    validar_intervalo_para_criacao(
        db,
        dados.prestador_id,
        dados.servico_id,
        dados.inicio,
        catalogo_headers,
    )
    adquirir_lock_prestador(db, dados.prestador_id)
    validar_intervalo_para_criacao(
        db,
        dados.prestador_id,
        dados.servico_id,
        dados.inicio,
        catalogo_headers,
    )

    conflito = (
        db.execute(
            select(Agendamento)
            .where(
                Agendamento.prestador_id == dados.prestador_id,
                Agendamento.inicio == dados.inicio,
                Agendamento.status.in_(["pendente", "confirmado"])
            )
            .with_for_update()
        )
        .scalars()
        .first()
    )

    if conflito:
        raise HTTPException(
            status_code=409,
            detail="Horário indisponível. Este prestador já possui um agendamento neste horário."
        )

    agendamento = Agendamento(
        cliente_id=cliente_id,
        prestador_id=dados.prestador_id,
        servico_id=dados.servico_id,
        inicio=dados.inicio,
        status="pendente"
    )
    db.add(agendamento)
    db.flush()

    historico = HistoricoAgendamento(
        agendamento_id=agendamento.id,
        usuario_id=cliente_id,
        status_anterior=None,
        status_novo="pendente",
        motivo="Agendamento criado"
    )
    db.add(historico)
    db.commit()
    db.refresh(agendamento)

    publicar_evento(agendamento)

    return agendamento


def atualizar_status(
    db: Session,
    agendamento_id: int,
    usuario_id: int,
    dados: AgendamentoStatusUpdate,
    tipo_usuario: str,
    prestador_ids: list[int] | None = None
) -> Agendamento:
    """
    Atualiza o status de um agendamento.
    - Retorna 404 se não existir ou não pertencer ao usuário logado.
    - Registra o histórico com status_anterior e status_novo.
    - O UPDATE em Agendamento dispara trigger e gera linha em logs_auditoria.
    - O INSERT em HistoricoAgendamento também dispara trigger e gera linha em logs_auditoria.
    """
    query = db.query(Agendamento).filter(Agendamento.id == agendamento_id)

    if tipo_usuario == "prestador":
        if not prestador_ids:
            raise HTTPException(
                status_code=404,
                detail="Agendamento nÃ£o encontrado ou nÃ£o pertence ao usuÃ¡rio logado."
            )
        query = query.filter(Agendamento.prestador_id.in_(prestador_ids))
    elif tipo_usuario != "admin":
        query = query.filter(Agendamento.cliente_id == usuario_id)

    agendamento = query.first()

    if not agendamento:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado ou não pertence ao usuário logado."
        )

    status_anterior = agendamento.status
    motivo = dados.motivo
    if dados.status == "cancelado":
        motivo = validar_cancelamento(agendamento, dados.motivo)

    agendamento.status = dados.status

    historico = HistoricoAgendamento(
        agendamento_id=agendamento.id,
        usuario_id=usuario_id,
        status_anterior=status_anterior,
        status_novo=dados.status,
        motivo=motivo
    )
    db.add(historico)
    db.commit()
    db.refresh(agendamento)

    publicar_evento_status(
        agendamento,
        status_anterior=status_anterior,
        usuario_id=usuario_id,
        tipo_usuario=tipo_usuario,
        motivo=motivo,
    )

    return agendamento
