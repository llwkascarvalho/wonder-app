from fastapi import FastAPI
from src.main.core.config import settings

app = FastAPI(
    title="Wonder - Serviço AI",
    description="Responsável pelas análises e recomendações via Google Gemini.",
    version="1.0.0"
)

@app.on_event("startup")
def verificar_configuracao():
    if settings.GEMINI_API_KEY:
        print("✅ GEMINI_API_KEY carregada com sucesso via Pydantic.")
    else:
        print("⚠️  GEMINI_API_KEY não encontrada no .env.")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "ai"}