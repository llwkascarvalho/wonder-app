import json
import time
import threading
import pika
from src.main.core.config import settings
from src.main.core.database import SessionLocal
from src.main.repositories import notificacao_repo


def processar_mensagem(ch, method, properties, body):
    """
    Callback chamado automaticamente quando chega uma mensagem na fila.
    Cria uma notificação no banco para o cliente envolvido no agendamento.
    O INSERT dispara o trigger de auditoria no PostgreSQL automaticamente.
    """
    try:
        dados = json.loads(body)
        print(f"[consumer] Mensagem recebida: {dados}")

        cliente_id  = str(dados.get("cliente_id"))
        agendamento_id = dados.get("agendamento_id")
        inicio      = dados.get("inicio", "horário não informado")

        mensagem = (
            f"Seu agendamento #{agendamento_id} foi confirmado para {inicio}. "
            f"Até breve!"
        )

        db = SessionLocal()
        try:
            notificacao_repo.criar(db, usuario_id=cliente_id, mensagem=mensagem)
            print(f"[consumer] Notificação criada para usuário {cliente_id}.")
        finally:
            db.close()

        # Confirma que a mensagem foi processada com sucesso
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[consumer] Erro ao processar mensagem: {e}")
        # Rejeita a mensagem sem recolocar na fila para evitar loop infinito
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def iniciar_consumer():
    """
    Conecta ao RabbitMQ e começa a escutar a fila wonder.eventos.
    Tenta reconectar automaticamente se a conexão cair.
    """
    while True:
        try:
            credentials = pika.PlainCredentials(
                settings.RABBITMQ_USER,
                settings.RABBITMQ_PASSWORD
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

            # Garante que a fila existe antes de escutar
            channel.queue_declare(queue="wonder.eventos", durable=True)

            # Processa uma mensagem por vez
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(
                queue="wonder.eventos",
                on_message_callback=processar_mensagem
            )

            print("[consumer] Aguardando mensagens na fila wonder.eventos...")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError:
            print("[consumer] RabbitMQ indisponível. Tentando novamente em 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"[consumer] Erro inesperado: {e}. Reiniciando em 5s...")
            time.sleep(5)


def iniciar_consumer_em_background():
    """
    Inicia o consumer em uma thread separada para não bloquear o FastAPI.
    """
    thread = threading.Thread(target=iniciar_consumer, daemon=True)
    thread.start()
    print("[consumer] Thread do consumer iniciada em background.")
