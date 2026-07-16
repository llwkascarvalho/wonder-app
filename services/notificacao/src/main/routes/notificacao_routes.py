from typing import List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from src.main.dependencies.db import get_db
from src.main.repositories import notificacao_repo
from src.main.schemas.notificacao_schema import NotificacaoResponse

router = APIRouter(tags=["Notificações"])

def get_user_id(request: Request) -> int:
    return int(request.headers.get("X-User-ID"))

@router.get("/notificacoes", response_model=List[NotificacaoResponse])
def listar_notificacoes(
    request: Request,
    status: str = None,
    db: Session = Depends(get_db)
):
    usuario_id = get_user_id(request)
    return notificacao_repo.listar_notificacoes(db, usuario_id, status=status)

@router.patch("/notificacoes/{id}/lida", response_model=NotificacaoResponse)
def marcar_notificacao_como_lida(
    id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    usuario_id = get_user_id(request)
    return notificacao_repo.marcar_como_lida(db, id, usuario_id)
