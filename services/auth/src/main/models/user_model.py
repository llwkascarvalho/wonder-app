from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from src.main.core.database import Base

class CustomUser(Base):
    __tablename__ = "CustomUser"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    tipo_usuario = Column(String(50), default="cliente")
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())