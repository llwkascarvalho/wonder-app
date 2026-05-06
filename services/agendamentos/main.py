import os
import psycopg2
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Wonder - Serviço Agendamentos",
    description="Responsável pelo controle de agendamentos e concorrência.",
    version="1.0.0"
)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("AGENDAMENTOS_DB_HOST"),
        port=os.getenv("AGENDAMENTOS_DB_PORT"),
        dbname=os.getenv("AGENDAMENTOS_DB_NAME"),
        user=os.getenv("AGENDAMENTOS_DB_USER"),
        password=os.getenv("AGENDAMENTOS_DB_PASSWORD")
    )

@app.on_event("startup")
def verificar_conexao_banco():
    try:
        conn = get_db_connection()
        conn.close()
        print("✅ Conexão com db_agendamentos estabelecida com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao conectar com db_agendamentos: {e}")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "agendamentos"}
