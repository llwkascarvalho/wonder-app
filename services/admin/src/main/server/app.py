from fastapi import FastAPI
from src.main.routes import auditoria_routes, monitoramento_routes, prestador_routes

app = FastAPI(
    title="Wonder - Serviço Admin",
    description="Serviço administrativo: consulta unificada dos logs de auditoria dos quatro bancos.",
    version="1.0.0"
)

app.include_router(auditoria_routes.router, prefix="/admin")
app.include_router(monitoramento_routes.router, prefix="/admin")
app.include_router(prestador_routes.router, prefix="/admin")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "admin"}
