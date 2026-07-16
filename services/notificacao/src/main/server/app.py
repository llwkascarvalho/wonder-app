from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.main.routes import notificacao_routes
from src.main.consumer.consumer import iniciar_consumer_em_background


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Inicia o consumer RabbitMQ em background quando o serviço sobe.
    O consumer fica escutando a fila wonder.eventos continuamente.
    """
    iniciar_consumer_em_background()
    yield


app = FastAPI(
    title="Wonder - Serviço Notificação",
    description="Responsável pelo envio de lembretes e notificações via mensageria.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(notificacao_routes.router)


@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "notificacao"}
