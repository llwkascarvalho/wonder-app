from pydantic import BaseModel
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