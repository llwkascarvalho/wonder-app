import os
import psycopg2
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Wonder - Serviço Notificação",
    description="Responsável pelo envio de lembretes e notificações via mensageria.",
    version="1.0.0"
)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("NOTIFICACOES_DB_HOST"),
        port=os.getenv("NOTIFICACOES_DB_PORT"),
        dbname=os.getenv("NOTIFICACOES_DB_NAME"),
        user=os.getenv("NOTIFICACOES_DB_USER"),
        password=os.getenv("NOTIFICACOES_DB_PASSWORD")
    )

@app.on_event("startup")
def verificar_conexao_banco():
    try:
        conn = get_db_connection()
        conn.close()
        print("✅ Conexão com db_notificacoes estabelecida com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao conectar com db_notificacoes: {e}")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "notificacao"}
