from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from src.main.core.database import Base

class Agendamento(Base):
    __tablename__ = "agendamento"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, index=True, nullable=False)
    prestador_id = Column(Integer, nullable=False)
    servico_id = Column(Integer, nullable=False)
    inicio = Column(DateTime, nullable=False)
    status = Column(String(20), default="pendente")
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    historico = relationship("HistoricoAgendamento", back_populates="agendamento")

class HistoricoAgendamento(Base):
    __tablename__ = "historico_agendamento"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, nullable=False)
    agendamento_id = Column(Integer, ForeignKey("agendamento.id"), nullable=False)
    status_anterior = Column(String(20), nullable=True)
    status_novo = Column(String(20), nullable=False)
    motivo = Column(String(100), nullable=True)
    data_hora = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agendamento = relationship("Agendamento", back_populates="historico")

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(String(36), primary_key=True)
    usuario_id = Column(Integer, nullable=True)
    operacao = Column(String(10), nullable=False)
    tabela_afetada = Column(String(100), nullable=False)
    dados_antigos = Column(JSONB, nullable=True)
    dados_novos = Column(JSONB, nullable=True)
    data_hora = Column(DateTime, default=lambda: datetime.now(timezone.utc))