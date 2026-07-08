from sqlalchemy.orm import Session
from src.main.models.agendamento_model import Agendamento, HistoricoAgendamento
from sqlalchemy import select
from fastapi import HTTPException
from src.main.schemas.agendamento_schema import AgendamentoCreate, AgendamentoStatusUpdate
import pika
import json
from src.main.core.config import settings


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


def publicar_evento_cancelamento(agendamento: Agendamento, motivo: str = None):
    """Publica o evento de cancelamento sem impedir a atualização no banco."""
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
                "status_novo": "cancelado",
                "motivo": motivo
            }),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"✅ Evento de cancelamento publicado para agendamento id={agendamento.id}")
    except Exception as e:
        print(f"⚠️  Falha ao publicar cancelamento no RabbitMQ: {e}")


def listar_agendamentos(
    db: Session,
    usuario_id: int,
    tipo_usuario: str,
    prestador_ids: list[int] | None = None
) -> list[Agendamento]:
    if tipo_usuario == "admin":
        return db.query(Agendamento).order_by(Agendamento.inicio.desc()).all()

    if tipo_usuario == "prestador":
        if not prestador_ids:
            return []
        return (
            db.query(Agendamento)
            .filter(Agendamento.prestador_id.in_(prestador_ids))
            .order_by(Agendamento.inicio.desc())
            .all()
        )

    return (
        db.query(Agendamento)
        .filter(Agendamento.cliente_id == usuario_id)
        .order_by(Agendamento.inicio.desc())
        .all()
    )


def obter_agendamento(db: Session, agendamento_id: int, cliente_id: int) -> Agendamento:
    agendamento = db.query(Agendamento).filter(
        Agendamento.id == agendamento_id,
        Agendamento.cliente_id == cliente_id
    ).first()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return agendamento


def criar_agendamento(db: Session, dados: AgendamentoCreate, cliente_id: int) -> Agendamento:
    """
    Cria agendamento com controle de concorrência via SELECT FOR UPDATE.
    Impede double booking: mesmo prestador, mesmo horário.
    """
    conflito = (
        db.execute(
            select(Agendamento)
            .where(
                Agendamento.prestador_id == dados.prestador_id,
                Agendamento.inicio == dados.inicio,
                Agendamento.status.notin_(["cancelado"])
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
    agendamento.status = dados.status

    historico = HistoricoAgendamento(
        agendamento_id=agendamento.id,
        usuario_id=usuario_id,
        status_anterior=status_anterior,
        status_novo=dados.status,
        motivo=dados.motivo
    )
    db.add(historico)
    db.commit()
    db.refresh(agendamento)

    if dados.status == "cancelado":
        publicar_evento_cancelamento(agendamento, motivo=dados.motivo)

    return agendamento
