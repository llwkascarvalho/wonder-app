import os
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Wonder - Serviço AI",
    description="Responsável pelas análises e recomendações via Google Gemini.",
    version="1.0.0"
)

@app.on_event("startup")
def verificar_configuracao():
    chave = os.getenv("GEMINI_API_KEY")
    if chave:
        print("✅ GEMINI_API_KEY carregada com sucesso.")
    else:
        print("⚠️  GEMINI_API_KEY não encontrada. Configure no .env.")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "ai"}
