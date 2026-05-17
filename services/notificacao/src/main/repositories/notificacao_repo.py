from sqlalchemy.orm import Session
from src.main.models.notificacao_model import Notificacao

def criar(db: Session, usuario_id: int, mensagem: str):
    nova_notificacao = Notificacao(
        usuario_id=usuario_id,
        mensagem=mensagem
    )
    db.add(nova_notificacao)
    db.commit()
    db.refresh(nova_notificacao)
    return nova_notificacao