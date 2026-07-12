import httpx
import base64
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode, urlparse
from sqlalchemy.orm import Session

from src.main.core.config import settings
from src.main.dependencies.db import get_db
from src.main.repositories import user_repo
from src.main.core.security import gerar_jwt
from src.main.schemas.auth_schema import TipoUpdate, TokenResponse, UsuarioResponse

router = APIRouter(tags=["Autenticação"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
ALLOWED_MOBILE_REDIRECT_URIS = {"wonder://auth"}

def encode_state(payload: dict) -> str:
    state_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(state_json).decode("utf-8").rstrip("=")

def decode_state(state: str | None) -> dict:
    if not state:
        return {}

    try:
        padded_state = state + "=" * ((4 - len(state) % 4) % 4)
        state_json = base64.urlsafe_b64decode(padded_state.encode("utf-8")).decode("utf-8")
        payload = json.loads(state_json)
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}

def validar_mobile_redirect_uri(redirect_uri: str) -> str:
    parsed_uri = urlparse(redirect_uri)
    is_expo_go_redirect = (
        parsed_uri.scheme == "exp"
        and parsed_uri.path == "/--/auth"
        and bool(parsed_uri.hostname)
        and bool(parsed_uri.port)
    )
    is_expo_web_redirect = (
        parsed_uri.scheme == "http"
        and parsed_uri.hostname in {"localhost", "127.0.0.1"}
        and parsed_uri.path in {"/--/auth", "/auth"}
        and bool(parsed_uri.port)
    )

    if (
        redirect_uri not in ALLOWED_MOBILE_REDIRECT_URIS
        and not is_expo_go_redirect
        and not is_expo_web_redirect
    ):
        raise HTTPException(status_code=400, detail="Redirect URI mobile inválida.")

    return redirect_uri

def is_admin(request: Request) -> bool:
    return request.headers.get("X-User-Role", "").lower() == "admin"

def validar_admin(request: Request):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

def validar_chamada_admin_interna(request: Request):
    validar_admin(request)
    if request.headers.get("X-Internal-Service") != "admin":
        raise HTTPException(status_code=403, detail="Endpoint restrito ao servico Admin.")

@router.get("/auth/google/login")
def google_login(
    mobile: bool = False,
    redirect_uri: str | None = None
):
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }

    if mobile:
        mobile_redirect_uri = validar_mobile_redirect_uri(redirect_uri or "wonder://auth")
        params["state"] = encode_state({
            "mobile": True,
            "redirect_uri": mobile_redirect_uri,
        })

    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")

@router.get("/auth/google/callback", response_model=TokenResponse)
async def google_callback(code: str, state: str | None = None, db: Session = Depends(get_db)):
    state_payload = decode_state(state)

    async with httpx.AsyncClient() as client:
        # Busca Token
        token_response = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        })

        if token_response.status_code != 200:
            try:
                google_error = token_response.json()
            except ValueError:
                google_error = {}

            print(
                "[auth][oauth] erro token google:",
                "status_code=",
                token_response.status_code,
                "error=",
                google_error.get("error"),
                "error_description=",
                google_error.get("error_description"),
                flush=True,
            )
            raise HTTPException(
                status_code=400,
                detail="Falha na autenticação com Google. Tente novamente.",
            )
        access_token = token_response.json().get("access_token")

        # Busca Usuário
        user_response = await client.get(
            GOOGLE_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Falha ao obter dados do usuário.")
        
        user_data = user_response.json()
        email = user_data.get("email")
        username = user_data.get("name", email)

    # Upsert no banco
    usuario = user_repo.upsert_usuario(db, email=email, username=username)

    # Gera JWT
    token = gerar_jwt(usuario_id=usuario.id, email=usuario.email, tipo_usuario=usuario.tipo_usuario)

    if state_payload.get("mobile") is True:
        mobile_redirect_uri = validar_mobile_redirect_uri(
            str(state_payload.get("redirect_uri") or "wonder://auth")
        )
        return RedirectResponse(url=f"{mobile_redirect_uri}?token={token}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "email": usuario.email,
            "tipo_usuario": usuario.tipo_usuario
        }
    }

@router.get("/auth/usuarios", response_model=List[UsuarioResponse])
def listar_usuarios(request: Request, db: Session = Depends(get_db)):
    validar_admin(request)
    return user_repo.listar_usuarios(db)

@router.get("/auth/usuarios/{user_id}", response_model=UsuarioResponse)
def obter_usuario(user_id: int, request: Request, db: Session = Depends(get_db)):
    validar_admin(request)
    return user_repo.obter_usuario(db, user_id)

@router.patch("/auth/usuarios/{user_id}/tipo", response_model=UsuarioResponse)
def atualizar_tipo(user_id: int, dados: TipoUpdate, request: Request, db: Session = Depends(get_db)):
    validar_admin(request)

    if dados.tipo_usuario not in ["cliente", "prestador", "admin"]:
        raise HTTPException(status_code=400, detail="Tipo inválido.")

    return user_repo.atualizar_tipo(db, user_id, dados.tipo_usuario)

@router.patch("/auth/internal/usuarios/{user_id}/tipo", response_model=UsuarioResponse)
def atualizar_tipo_interno(user_id: int, dados: TipoUpdate, request: Request, db: Session = Depends(get_db)):
    validar_chamada_admin_interna(request)

    if dados.tipo_usuario != "prestador":
        raise HTTPException(status_code=400, detail="Endpoint interno permite apenas promocao para prestador.")

    return user_repo.atualizar_tipo(db, user_id, dados.tipo_usuario)
