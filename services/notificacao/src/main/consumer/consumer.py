import json
import threading
import time
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

import pika

from src.main.core.config import settings
from src.main.core.database import SessionLocal
from src.main.repositories import notificacao_repo


class EnriquecimentoCriticoErro(Exception):
    pass


def catalogo_headers() -> dict[str, str]:
    return {
        "X-User-ID": "0",
        "X-User-Role": "admin",
        "X-Internal-Service": "notificacao",
    }


def get_json(url: str) -> dict | list:
    request = UrlRequest(url, headers=catalogo_headers())
    with urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def buscar_prestador(prestador_id: int | str) -> dict:
    try:
        payload = get_json(f"{settings.CATALOGO_URL}/catalogo/prestadores/{prestador_id}")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise EnriquecimentoCriticoErro(
            f"Falha ao resolver prestador_id={prestador_id} no Catalogo: {exc}"
        ) from exc

    if not isinstance(payload, dict) or not payload.get("usuario_id"):
        raise EnriquecimentoCriticoErro(
            f"Catalogo nao retornou usuario_id para prestador_id={prestador_id}."
        )

    return payload


def buscar_nome_servico(prestador_id: int | str, servico_id: int | str | None) -> str | None:
    if not servico_id:
        return None

    try:
        payload = get_json(f"{settings.CATALOGO_URL}/catalogo/prestadores/{prestador_id}/servicos")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(
            f"[consumer] Falha ao buscar nome do servico id={servico_id}; usando mensagem generica: {exc}",
            flush=True,
        )
        return None

    if not isinstance(payload, list):
        return None

    for servico in payload:
        if isinstance(servico, dict) and str(servico.get("id")) == str(servico_id):
            nome = servico.get("nome")
            return str(nome) if nome else None

    return None


def formatar_data(inicio: str | None) -> str | None:
    if not inicio:
        return None

    try:
        data = datetime.fromisoformat(inicio)
    except ValueError:
        return None

    return data.strftime("%d/%m/%Y as %H:%M").replace(" as ", " às ")


def descricao_agendamento(nome_servico: str | None, nome_estab: str | None) -> str:
    if nome_servico and nome_estab:
        return f" de {nome_servico} em {nome_estab}"
    if nome_servico:
        return f" de {nome_servico}"
    if nome_estab:
        return f" em {nome_estab}"
    return ""


def texto_horario(inicio_formatado: str | None) -> str:
    return f" para {inicio_formatado}" if inicio_formatado else ""


def texto_motivo(motivo: str | None) -> str:
    motivo_normalizado = (motivo or "").strip()
    return f" Motivo: {motivo_normalizado}" if motivo_normalizado else ""


def montar_notificacoes(dados: dict, prestador: dict, nome_servico: str | None) -> list[tuple[int, str, str]]:
    cliente_id = int(dados["cliente_id"])
    prestador_usuario_id = int(prestador["usuario_id"])
    nome_estab = prestador.get("nome_estab")
    inicio = formatar_data(dados.get("inicio"))
    detalhe = descricao_agendamento(nome_servico, nome_estab)
    horario = texto_horario(inicio)
    status_novo = dados.get("status_novo")
    alterado_por_tipo = str(dados.get("alterado_por_tipo") or "").lower()
    motivo = texto_motivo(dados.get("motivo"))
    notificacoes: list[tuple[int, str, str]] = []

    if not status_novo:
        notificacoes.append(
            (
                prestador_usuario_id,
                "novo_agendamento",
                f"Um cliente agendou um horário{detalhe}{horario}.",
            )
        )
        notificacoes.append(
            (
                cliente_id,
                "novo_agendamento",
                f"Seu agendamento{detalhe} foi criado com sucesso{horario}.",
            )
        )
        return notificacoes

    if status_novo == "cancelado":
        if alterado_por_tipo == "cliente":
            notificacoes.append(
                (
                    prestador_usuario_id,
                    "cancelado_cliente",
                    f"Um cliente cancelou um agendamento{detalhe}{horario}.{motivo}",
                )
            )
            notificacoes.append(
                (
                    cliente_id,
                    "cancelado_cliente",
                    f"Seu agendamento{detalhe} foi cancelado.{motivo}",
                )
            )
        else:
            notificacoes.append(
                (
                    cliente_id,
                    "cancelado_prestador",
                    f"Seu agendamento{detalhe} foi cancelado pelo prestador.{motivo}",
                )
            )
        return notificacoes

    if status_novo == "confirmado":
        notificacoes.append(
            (
                cliente_id,
                "confirmado",
                f"Seu agendamento{detalhe} foi confirmado pelo prestador.",
            )
        )
    elif status_novo in {"concluido", "finalizado"}:
        notificacoes.append(
            (
                cliente_id,
                "concluido",
                f"Seu atendimento{detalhe} foi concluído.",
            )
        )

    return notificacoes


def reenfileirar_com_retry(ch, method, properties, body: bytes, erro: Exception) -> None:
    headers = dict(properties.headers or {})
    retry_count = int(headers.get("x-retry-count", 0))

    if retry_count >= settings.RABBITMQ_MAX_RETRIES:
        print(
            f"[consumer] Falha critica apos {retry_count} tentativas. Mensagem rejeitada sem requeue: {erro}",
            flush=True,
        )
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    headers["x-retry-count"] = retry_count + 1
    print(
        f"[consumer] Falha critica ao enriquecer mensagem. Reenfileirando tentativa "
        f"{headers['x-retry-count']}/{settings.RABBITMQ_MAX_RETRIES}: {erro}",
        flush=True,
    )
    ch.basic_publish(
        exchange=settings.RABBITMQ_EXCHANGE,
        routing_key=settings.RABBITMQ_ROUTING_KEY,
        body=body,
        properties=pika.BasicProperties(delivery_mode=2, headers=headers),
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)


def processar_mensagem(ch, method, properties, body):
    """
    Cria notificacoes para os destinatarios corretos do evento de agendamento.
    O dono do prestador e resolvido no Catalogo por prestador_id -> usuario_id.
    """
    try:
        dados = json.loads(body)
        print(f"[consumer] Mensagem recebida: {dados}", flush=True)

        agendamento_id = dados.get("agendamento_id")
        prestador = buscar_prestador(dados["prestador_id"])
        nome_servico = buscar_nome_servico(dados["prestador_id"], dados.get("servico_id"))
        notificacoes = montar_notificacoes(dados, prestador, nome_servico)
        criadas: set[tuple[object, int, str]] = set()

        db = SessionLocal()
        try:
            for usuario_id, tipo_evento, mensagem in notificacoes:
                chave = (agendamento_id, usuario_id, tipo_evento)
                if chave in criadas:
                    continue

                notificacao_repo.criar(db, usuario_id=usuario_id, mensagem=mensagem)
                criadas.add(chave)
                print(
                    f"[consumer] Notificacao criada para usuario {usuario_id} ({tipo_evento}).",
                    flush=True,
                )
        finally:
            db.close()

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except EnriquecimentoCriticoErro as exc:
        reenfileirar_com_retry(ch, method, properties, body, exc)
    except Exception as exc:
        print(f"[consumer] Erro ao processar mensagem: {exc}", flush=True)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def iniciar_consumer():
    """
    Conecta ao RabbitMQ e comeca a escutar a fila configurada.
    Tenta reconectar automaticamente se a conexao cair.
    """
    while True:
        try:
            credentials = pika.PlainCredentials(
                settings.RABBITMQ_USER,
                settings.RABBITMQ_PASSWORD,
            )
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=settings.RABBITMQ_HOST,
                    port=int(settings.RABBITMQ_PORT),
                    credentials=credentials,
                    heartbeat=60,
                )
            )
            channel = connection.channel()

            channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
            if settings.RABBITMQ_EXCHANGE:
                channel.exchange_declare(exchange=settings.RABBITMQ_EXCHANGE, durable=True)
                channel.queue_bind(
                    exchange=settings.RABBITMQ_EXCHANGE,
                    queue=settings.RABBITMQ_QUEUE,
                    routing_key=settings.RABBITMQ_ROUTING_KEY,
                )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(
                queue=settings.RABBITMQ_QUEUE,
                on_message_callback=processar_mensagem,
            )

            print(f"[consumer] Aguardando mensagens na fila {settings.RABBITMQ_QUEUE}...", flush=True)
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError:
            print("[consumer] RabbitMQ indisponivel. Tentando novamente em 5s...", flush=True)
            time.sleep(5)
        except Exception as exc:
            print(f"[consumer] Erro inesperado: {exc}. Reiniciando em 5s...", flush=True)
            time.sleep(5)


def iniciar_consumer_em_background():
    thread = threading.Thread(target=iniciar_consumer, daemon=True)
    thread.start()
    print("[consumer] Thread do consumer iniciada em background.", flush=True)
