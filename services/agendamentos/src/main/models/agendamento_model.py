from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.main.core.database import Base

class Agendamento(Base):
    __tablename__ = "agendamento"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(String(255), index=True, nullable=False)
    prestador_id = Column(Integer, nullable=False)
    servico_id = Column(Integer, nullable=False)
    data_hora_inicio = Column(DateTime, nullable=False)
    status = Column(String(50), default="pendente") # pendente, confirmado, cancelado, concluído

    historico = relationship("HistoricoAgendamento", back_populates="agendamento")

class HistoricoAgendamento(Base):
    __tablename__ = "historico_agendamento"

    id = Column(Integer, primary_key=True, index=True)
    agendamento_id = Column(Integer, ForeignKey("agendamento.id"), nullable=False)
    status_anterior = Column(String(50), nullable=True)
    status_novo = Column(String(50), nullable=False)
    motivo = Column(String(255), nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow)

    agendamento = relationship("Agendamento", back_populates="historico")

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(255), nullable=False) 
    operacao = Column(String(50), nullable=False)
    tabela_afetada = Column(String(50), nullable=False)
    dados_novos = Column(JSON, nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow)