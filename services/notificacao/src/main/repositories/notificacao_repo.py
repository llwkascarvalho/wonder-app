from sqlalchemy.orm import Session
from fastapi import HTTPException
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

def listar_notificacoes(db: Session, usuario_id: int, status: str = None):
    query = db.query(Notificacao).filter(Notificacao.usuario_id == usuario_id)

    if status:
        query = query.filter(Notificacao.status == status)

    return query.all()

def marcar_como_lida(db: Session, notificacao_id: int, usuario_id: int):
    notificacao = db.query(Notificacao).filter(
        Notificacao.id == notificacao_id,
        Notificacao.usuario_id == usuario_id
    ).first()

    if not notificacao:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")

    notificacao.status = "lida"
    db.commit()
    db.refresh(notificacao)
    return notificacao
