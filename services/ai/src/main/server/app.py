from fastapi import FastAPI
from src.main.core.config import settings
from src.main.routes.ai_routes import router as ai_router

app = FastAPI(
    title="Wonder - Serviço AI",
    description="Responsável pelas análises e recomendações via Google Gemini.",
    version="1.0.0"
)

@app.on_event("startup")
def verificar_configuracao():
    if settings.OPENROUTER_API_KEY:
        print("✅ OPENROUTER_API_KEY carregada com sucesso.", flush=True)
    else:
        print("⚠️  OPENROUTER_API_KEY não encontrada. Endpoint /ai/chat retornará 503.", flush=True)

app.include_router(ai_router)

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "ai"}