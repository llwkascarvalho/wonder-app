from sqlalchemy import Column, DateTime, Integer, String, Float, ForeignKey, JSON, SmallInteger, Time, UniqueConstraint, func
from sqlalchemy.orm import relationship
from src.main.core.database import Base

class Prestador(Base):
    __tablename__ = "prestador"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String, index=True, nullable=False)
    nome_estab = Column(String, nullable=False)
    documento = Column(String, nullable=False, unique=True)
    endereco = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    status = Column(String, default="rascunho")
    enviado_em = Column(DateTime, nullable=True)
    aprovado_em = Column(DateTime, nullable=True)
    aprovado_por = Column(String, nullable=True)
    motivo_rejeicao = Column(String, nullable=True)
    foto = Column(String(500), nullable=True)

    servicos = relationship("Servico", back_populates="prestador")
    horarios = relationship("HorarioFuncionamento", back_populates="prestador")
    avaliacoes = relationship("Avaliacao", back_populates="prestador")
    categorias = relationship("PrestadorCategoria", back_populates="prestador")
    fotos_estabelecimento = relationship(
        "FotoEstabelecimento",
        back_populates="prestador",
        order_by="FotoEstabelecimento.ordem",
        cascade="all, delete-orphan",
    )

    @property
    def foto_url(self):
        return self.foto


class FotoEstabelecimento(Base):
    __tablename__ = "foto_estabelecimento"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id", ondelete="CASCADE"), nullable=False)
    foto = Column(String(500), nullable=False)
    ordem = Column(Integer, nullable=False, default=0)
    criado_em = Column(DateTime, nullable=False, server_default=func.now())

    prestador = relationship("Prestador", back_populates="fotos_estabelecimento")

    @property
    def foto_url(self):
        return self.foto

class Categoria(Base):
    __tablename__ = "categoria"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    status = Column(String, default="ativa", nullable=False)
    foto = Column(String(500), nullable=True)

    prestadores = relationship("PrestadorCategoria", back_populates="categoria")

    @property
    def foto_url(self):
        return self.foto

class PrestadorCategoria(Base):
    __tablename__ = "prestador_categoria"
    __table_args__ = (
        UniqueConstraint("prestador_id", "categoria_id", name="uq_prestador_categoria"),
    )

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=False)

    prestador = relationship("Prestador", back_populates="categorias")
    categoria = relationship("Categoria", back_populates="prestadores")

class Servico(Base):
    __tablename__ = "servico"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestador.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=True)
    nome = Column(String, nullable=False)
    preco = Column(Float, nullable=False)
    duracao_min = Column(Integer, nullable=False)
    foto = Column(String(500), nullable=True)

    prestador = relationship("Prestador", back_populates="servicos")
    categoria = relationship("Categoria")

    @property
    def foto_url(self):
        return self.foto

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
