from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from src.main.core.database import Base

class CustomUser(Base):
    __tablename__ = "customuser"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    telefone = Column(String(30), nullable=True)
    foto_perfil = Column(String(500), nullable=True)
    tipo_usuario = Column(String(50), default="cliente")
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def nome(self):
        return self.username

    @property
    def foto_url(self):
        return self.foto_perfil
