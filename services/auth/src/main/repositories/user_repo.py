from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import func
from src.main.models.user_model import CustomUser

def upsert_usuario(db: Session, email: str, username: str) -> CustomUser:
    stmt = insert(CustomUser).values(
        email=email,
        username=username,
        tipo_usuario='cliente'
    )
    
    stmt = stmt.on_conflict_do_update(
        index_elements=['email'],
        set_={'atualizado_em': func.now()}
    ).returning(CustomUser)

    result = db.execute(stmt)
    db.commit()
    
    return result.scalar_one()