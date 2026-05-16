from fastapi import FastAPI
from src.main.routes import prestador_routes

app = FastAPI(
    title="Wonder - Serviço Catálogo",
    description="Responsável pelo gerenciamento de prestadores e serviços.",
    version="1.0.0"
)

app.include_router(prestador_routes.router, prefix="/catalogo")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "catalogo"}