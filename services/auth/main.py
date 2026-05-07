import os
import httpx
import psycopg2
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

# ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────────

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI")
JWT_SECRET_KEY       = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM        = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MIN   = int(os.getenv("JWT_EXPIRATION_MINUTES", "60"))

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"

# APP 

app = FastAPI(
    title="Wonder - Serviço de Autenticação",
    description="Login via Google OAuth2 e geração de JWT.",
    version="1.0.0"
)

# BANCO

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
        print("✅ Conexão com db_autenticacao estabelecida.")
    except Exception as e:
        print(f"❌ Erro ao conectar com db_autenticacao: {e}")

# JWT 

def gerar_jwt(usuario_id: int, email: str, tipo_usuario: str) -> str:
    expiracao = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MIN)
    payload = {
        "sub": str(usuario_id),
        "email": email,
        "tipo_usuario": tipo_usuario,
        "exp": expiracao
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# BANCO: UPSERT DO USUÁRIO

def upsert_usuario(email: str, username: str) -> dict:
    """
    Insere o usuário se não existir (primeiro acesso).
    Atualiza atualizado_em se já existir (acessos seguintes).
    Retorna os dados do usuário em ambos os casos.
    O trigger fn_auditoria() no banco registra o INSERT ou UPDATE
    automaticamente em logs_auditoria sem código adicional aqui.
    """
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO CustomUser (username, email, tipo_usuario)
                    VALUES (%s, %s, 'cliente')
                    ON CONFLICT (email) DO UPDATE
                        SET atualizado_em = NOW()
                    RETURNING id, email, tipo_usuario
                """, (username, email))
                row = cur.fetchone()
                return {
                    "id": row[0],
                    "email": row[1],
                    "tipo_usuario": row[2]
                }
    finally:
        conn.close()

# ENDPOINTS

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "auth"}


@app.get("/auth/google/login", tags=["Autenticação"])
def google_login():
    """
    Redireciona o usuário para a tela de login do Google.
    """
    params = (
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(url=GOOGLE_AUTH_URL + params)


@app.get("/auth/google/callback", tags=["Autenticação"])
async def google_callback(code: str):
    """
    Recebe o código do Google, troca pelo token,
    busca os dados do usuário, faz upsert no banco e retorna JWT.
    """
    async with httpx.AsyncClient() as client:

        # 1. Troca o código pelo access_token
        token_response = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        })

        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Falha ao obter token do Google.")

        access_token = token_response.json().get("access_token")

        # 2. Usa o access_token para buscar os dados do usuário
        user_response = await client.get(
            GOOGLE_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Falha ao obter dados do usuário.")

        user_data = user_response.json()
        email    = user_data.get("email")
        username = user_data.get("name", email)

    # 3. Upsert no banco — trigger registra o log automaticamente
    usuario = upsert_usuario(email=email, username=username)

    # 4. Gera e retorna o JWT
    token = gerar_jwt(
        usuario_id=usuario["id"],
        email=usuario["email"],
        tipo_usuario=usuario["tipo_usuario"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario["id"],
            "email": usuario["email"],
            "tipo_usuario": usuario["tipo_usuario"]
        }
    }