from fastapi import FastAPI
from src.main.routes import auth_routes

app = FastAPI(
    title="Wonder - Serviço de Autenticação",
    description="Login via Google OAuth2 e geração de JWT.",
    version="1.0.0"
)

app.include_router(auth_routes.router)

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "auth"}