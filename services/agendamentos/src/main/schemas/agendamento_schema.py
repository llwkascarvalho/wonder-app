from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AgendamentoBase(BaseModel):
    prestador_id: int
    servico_id: int
    data_hora_inicio: datetime

class AgendamentoCreate(AgendamentoBase):
    pass

class AgendamentoResponse(AgendamentoBase):
    id: int
    cliente_id: str
    status: str

    class Config:
        from_attributes = True