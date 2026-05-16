from fastapi import FastAPI
from src.main.routes import notificacao_routes

app = FastAPI(
    title="Wonder - Serviço Notificação",
    description="Responsável pelo envio de lembretes e notificações via mensageria.",
    version="1.0.0"
)

app.include_router(notificacao_routes.router, prefix="/notificacoes")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "notificacao"}