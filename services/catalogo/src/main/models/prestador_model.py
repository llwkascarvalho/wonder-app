from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
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

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String, nullable=False)
    operacao = Column(String, nullable=False)
    tabela_afetada = Column(String, nullable=False)
    dados_novos = Column(JSON, nullable=True)