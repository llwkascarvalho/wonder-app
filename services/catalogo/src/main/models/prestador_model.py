from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, SmallInteger, Time
from sqlalchemy.orm import relationship
from src.main.core.database import Base

class Prestador(Base):
    __tablename__ = "prestador"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String, index=True, nullable=False)
    nome_estab = Column(String, nullable=False)
    documento = Column(String, nullable=False, unique=True)
    status = Column(String, default="ativo")

    servicos = relationship("Servico", back_populates="prestador")
    horarios = relationship("HorarioFuncionamento", back_populates="prestador")
    avaliacoes = relationship("Avaliacao", back_populates="prestador")

class Categoria(Base):
    __tablename__ = "categoria"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)

class Servico(Base):
    __tablename__ = "servico"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=True)
    nome = Column(String, nullable=False)
    preco = Column(Float, nullable=False)
    duracao_min = Column(Integer, nullable=False)

    prestador = relationship("Prestador", back_populates="servicos")
    categoria = relationship("Categoria")

class HorarioFuncionamento(Base):
    __tablename__ = "horariofuncionamento"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id"), nullable=False)
    dia_semana = Column(Integer, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fim = Column(Time, nullable=False)

    prestador = relationship("Prestador", back_populates="horarios")

class Avaliacao(Base):
    __tablename__ = "avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    agendamento_id = Column(Integer, nullable=False, unique=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id"), nullable=False)
    nota = Column(SmallInteger, nullable=False)

    prestador = relationship("Prestador", back_populates="avaliacoes")

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String, nullable=False)
    operacao = Column(String, nullable=False)
    tabela_afetada = Column(String, nullable=False)
    dados_novos = Column(JSON, nullable=True)
