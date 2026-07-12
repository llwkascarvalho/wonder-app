import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response
from jose import jwt, JWTError, ExpiredSignatureError
from src.main.core.config import settings

PUBLIC_PREFIXES = ["/auth/google/", "/health"]

SERVICE_PREFIX_ALIASES = {
    "notificacoes": "notificacao",
}

app = FastAPI(
    title="Wonder - API Gateway",
    description="Ponto de entrada único para todos os microsserviços.",
    version="1.0.0"
)

def is_public(path: str) -> bool:
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True
    return False

def verify_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")

def resolve_service(path: str):
    for name, url in settings.services.items():
        if path.startswith(f"/{name}"):
            return name, url

    for prefix, service_name in SERVICE_PREFIX_ALIASES.items():
        if path.startswith(f"/{prefix}"):
            return service_name, settings.services[service_name]

    return None, None

@app.get("/health", tags=["Infraestrutura"])
async def health_check():
    statuses = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, url in settings.services.items():
            try:
                r = await client.get(f"{url}/health")
                statuses[name] = r.json()
            except Exception:
                statuses[name] = {"status": "unreachable"}
    return {"status": "ok", "service": "gateway", "upstream": statuses}

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(full_path: str, request: Request):
    path = f"/{full_path}"
    user_id   = None
    user_role = None

    if not is_public(path):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token não fornecido.")
        token = auth_header.split(" ")[1]
        payload = verify_jwt(token)
        user_id   = payload.get("sub")
        user_role = payload.get("tipo_usuario")

    service_name, service_url = resolve_service(path)
    if service_url is None:
        raise HTTPException(status_code=404, detail=f"Rota não encontrada: {path}")

    target_url = f"{service_url}{path}"
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "x-user-id", "x-user-role", "x-internal-service"}
    }
    if user_id:
        headers["X-User-ID"]   = str(user_id)
    if user_role:
        headers["X-User-Role"] = str(user_role)

    body = await request.body()

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
