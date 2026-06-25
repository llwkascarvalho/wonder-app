from datetime import time
from pydantic import BaseModel, Field
from typing import Optional, List

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

    class Config:
        from_attributes = True

class CategoriaResponse(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True

# SCHEMAS DE PRESTADOR

class PrestadorBase(BaseModel):
    nome_estab: str
    documento: str

class PrestadorCreate(PrestadorBase):
    pass

class PrestadorUpdate(BaseModel):
    nome_estab: Optional[str] = None
    documento: Optional[str] = None
    status: Optional[str] = None

class PrestadorResponse(PrestadorBase):
    id: int
    usuario_id: int | str
    status: str
    
    class Config:
        from_attributes = True

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

# SCHEMAS DE AVALIACAO

class AvaliacaoCreate(BaseModel):
    agendamento_id: int
    nota: int = Field(ge=1, le=5)

class AvaliacaoResponse(AvaliacaoCreate):
    id: int
    prestador_id: int

    class Config:
        from_attributes = True
