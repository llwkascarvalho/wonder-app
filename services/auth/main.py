import os
import psycopg2
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Wonder - Serviço de Autenticação",
    description="Responsável pelo login via Google OAuth2 e geração de JWT.",
    version="1.0.0"
)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("AUTH_DB_HOST"),
        port=os.getenv("AUTH_DB_PORT"),
        dbname=os.getenv("AUTH_DB_NAME"),
        user=os.getenv("AUTH_DB_USER"),
        password=os.getenv("AUTH_DB_PASSWORD")
    )

@app.on_event("startup")
def verificar_conexao_banco():
    try:
        conn = get_db_connection()
        conn.close()
        print("✅ Conexão com db_autenticacao estabelecida com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao conectar com db_autenticacao: {e}")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "auth"}