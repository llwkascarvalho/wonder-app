import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
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

def is_admin(request: Request) -> bool:
    return request.headers.get("X-User-Role", "").lower() == "admin"

def validar_admin(request: Request):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

@router.get("/auth/google/login")
def google_login():
    params = (
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(url=GOOGLE_AUTH_URL + params)

@router.get("/auth/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: Session = Depends(get_db)):
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
            raise HTTPException(status_code=400, detail="Falha ao obter token do Google.")
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