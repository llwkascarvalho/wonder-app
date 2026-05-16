from pydantic import BaseModel
from typing import Optional, List

# SCHEMAS DE SERVIÇO

class ServicoBase(BaseModel):
    nome: str
    preco: float
    duracao_min: int
    categoria_id: Optional[int] = None

class ServicoResponse(ServicoBase):
    id: int
    prestador_id: int

    class Config:
        from_attributes = True

# SCHEMAS DE PRESTADOR

class PrestadorBase(BaseModel):
    nome_estab: str
    documento: str

class PrestadorCreate(PrestadorBase):
    pass

class PrestadorResponse(PrestadorBase):
    id: int
    usuario_id: str
    status: str
    
    class Config:
        from_attributes = True