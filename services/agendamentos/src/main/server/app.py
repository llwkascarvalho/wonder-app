from fastapi import FastAPI
from src.main.routes import agendamento_routes

app = FastAPI(
    title="Wonder - Serviço Agendamentos",
    description="Responsável pelo controle de agendamentos e concorrência.",
    version="1.0.0"
)

app.include_router(agendamento_routes.router)

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "agendamentos"}