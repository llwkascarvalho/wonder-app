import os
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response
from jose import jwt, JWTError, ExpiredSignatureError
from dotenv import load_dotenv

load_dotenv()

# CONFIGURAÇÕES 
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")

# URLs internas dos serviços na rede Docker
SERVICES = {
    "auth":         os.getenv("AUTH_SERVICE_URL",         "http://auth:8001"),
    "catalogo":     os.getenv("CATALOGO_SERVICE_URL",     "http://catalogo:8002"),
    "agendamentos": os.getenv("AGENDAMENTOS_SERVICE_URL", "http://agendamentos:8003"),
    "notificacao":  os.getenv("NOTIFICACAO_SERVICE_URL",  "http://notificacao:8004"),
    "ai":           os.getenv("AI_SERVICE_URL",           "http://ai:8005"),
}

# Rotas públicas — não exigem token JWT
PUBLIC_PREFIXES = ["/auth/", "/health"]

#  APP 
app = FastAPI(
    title="Wonder - API Gateway",
    description="Ponto de entrada único para todos os microsserviços.",
    version="1.0.0"
)


#  FUNÇÕES AUXILIARES 

def is_public(path: str) -> bool:
    """Verifica se a rota é pública (não precisa de token)."""
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


def verify_jwt(token: str) -> dict:
    """
    Valida o JWT usando python-jose.
    Retorna o payload se válido. Lança HTTPException 401 se inválido.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")


def resolve_service(path: str):
    """
    Descobre qual serviço interno deve receber a requisição
    baseado no prefixo da URL.
    Ex: /catalogo/prestadores → catalogo → http://catalogo:8002
    """
    for name, url in SERVICES.items():
        if path.startswith(f"/{name}"):
            return name, url
    return None, None


#  HEALTH 

@app.get("/health", tags=["Infraestrutura"])
async def health_check():
    """Retorna o status do Gateway e verifica todos os serviços internos."""
    statuses = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, url in SERVICES.items():
            try:
                r = await client.get(f"{url}/health")
                statuses[name] = r.json()
            except Exception:
                statuses[name] = {"status": "unreachable"}
    return {"status": "ok", "service": "gateway", "upstream": statuses}


#  PROXY PRINCIPAL 

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(full_path: str, request: Request):
    """
    Recebe todas as requisições externas, valida o JWT se necessário
    e encaminha para o serviço interno correto.
    """
    path = f"/{full_path}"
    user_id   = None
    user_role = None

    # Issue 7: Validação JWT para rotas protegidas
    if not is_public(path):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token não fornecido.")
        token = auth_header.split(" ")[1]
        payload = verify_jwt(token)
        user_id   = payload.get("sub")           # campo "sub" gerado pelo auth do Lwkas
        user_role = payload.get("tipo_usuario")  # campo "tipo_usuario" gerado pelo auth

    # Issue 6: Resolver serviço de destino
    service_name, service_url = resolve_service(path)
    if service_url is None:
        raise HTTPException(status_code=404, detail=f"Rota não encontrada: {path}")

    # Montar URL de destino
    target_url = f"{service_url}{path}"

    # Copiar headers e injetar dados do usuário autenticado
    headers = dict(request.headers)
    headers.pop("host", None)
    if user_id:
        headers["X-User-ID"]   = str(user_id)
    if user_role:
        headers["X-User-Role"] = str(user_role)

    body = await request.body()

    # Encaminhar requisição ao serviço interno
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            upstream = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=f"Serviço '{service_name}' indisponível no momento."
            )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=dict(upstream.headers),
        media_type=upstream.headers.get("content-type"),
    )
