from datetime import datetime, time
from pydantic import BaseModel, Field
from typing import Optional

# SCHEMAS DE SERVIÇO

class ServicoBase(BaseModel):
    nome: str
    preco: float
    duracao_min: int
    categoria_id: Optional[int] = None

class ServicoCreate(ServicoBase):
    pass

class ServicoResponse(ServicoBase):
    id: int
    prestador_id: int
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

class CategoriaResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    status: str
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None

class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None

class CategoriaStatusUpdate(BaseModel):
    status: str

class PrestadorCategoriaCreate(BaseModel):
    categoria_ids: list[int]

class PrestadorCategoriaResponse(BaseModel):
    prestador_id: int
    categoria: CategoriaResponse

    class Config:
        from_attributes = True

# SCHEMAS DE PRESTADOR

class PrestadorBase(BaseModel):
    nome_estab: str
    documento: str
    endereco: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    complemento: Optional[str] = None

class PrestadorCreate(PrestadorBase):
    pass

class PrestadorUpdate(BaseModel):
    nome_estab: Optional[str] = None
    documento: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    complemento: Optional[str] = None

class PrestadorResponse(PrestadorBase):
    id: int
    usuario_id: int | str
    status: str
    foto_url: Optional[str] = None
    enviado_em: Optional[datetime] = None
    aprovado_em: Optional[datetime] = None
    aprovado_por: Optional[str] = None
    motivo_rejeicao: Optional[str] = None
    
    class Config:
        from_attributes = True

class PrestadorStatusUpdate(BaseModel):
    status: str
    motivo_rejeicao: Optional[str] = None

# SCHEMAS DE HORARIO

class HorarioCreate(BaseModel):
    dia_semana: int
    hora_inicio: time
    hora_fim: time

class HorarioResponse(HorarioCreate):
    id: int
    prestador_id: int

    class Config:
        from_attributes = True

class PrestadorDetalheResponse(PrestadorResponse):
    servicos: list[ServicoResponse] = Field(default_factory=list)
    horarios: list[HorarioResponse] = Field(default_factory=list)
    categorias: list[PrestadorCategoriaResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

# SCHEMAS DE AVALIACAO

class AvaliacaoCreate(BaseModel):
    agendamento_id: int
    nota: int = Field(ge=1, le=5)

class AvaliacaoResponse(AvaliacaoCreate):
    id: int
    prestador_id: int

    class Config:
        from_attributes = True
