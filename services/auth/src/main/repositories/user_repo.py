from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import func
from fastapi import HTTPException
from src.main.models.user_model import CustomUser

def upsert_usuario(db: Session, email: str, username: str) -> CustomUser:
    stmt = insert(CustomUser).values(
        email=email,
        username=username,
        tipo_usuario='cliente'
    )
    
    stmt = stmt.on_conflict_do_update(
        index_elements=['email'],
        set_={
            'username': stmt.excluded.username,
            'atualizado_em': func.now()
        }
    ).returning(CustomUser)

    result = db.execute(stmt)
    db.commit()
    
    return result.scalar_one()

def listar_usuarios(db: Session):
    return db.query(CustomUser).all()

def obter_usuario(db: Session, user_id: int):
    user = db.query(CustomUser).filter(CustomUser.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    return user

def atualizar_tipo(db: Session, user_id: int, novo_tipo: str):
    user = obter_usuario(db, user_id)
    user.tipo_usuario = novo_tipo
    db.commit()
    db.refresh(user)
    return user
