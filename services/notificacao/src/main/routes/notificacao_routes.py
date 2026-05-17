from typing import List
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from src.main.dependencies.db import get_db
from src.main.models.notificacao_model import Notificacao
from src.main.schemas.notificacao_schema import NotificacaoResponse

router = APIRouter(tags=["Notificações"])

@router.get("/notificacoes", response_model=List[NotificacaoResponse])
def listar_notificacoes(
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    notificacoes = db.query(Notificacao).filter(Notificacao.usuario_id == x_user_id).all()
    return notificacoes