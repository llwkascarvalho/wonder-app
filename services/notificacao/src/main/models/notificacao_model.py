from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from src.main.core.database import Base

class Notificacao(Base):
    __tablename__ = "notificacao"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(255), index=True, nullable=False)
    mensagem = Column(String, nullable=False)
    status = Column(String(50), default="pendente")
    criado_em = Column(DateTime, server_default=func.now())

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(255), nullable=False)
    operacao = Column(String(50), nullable=False)
    tabela_afetada = Column(String(50), nullable=False)
    dados_novos = Column(JSON, nullable=True)
    data_hora = Column(DateTime, server_default=func.now())