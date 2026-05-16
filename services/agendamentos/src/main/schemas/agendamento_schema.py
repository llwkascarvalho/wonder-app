from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AgendamentoCreate(BaseModel):
    prestador_id: int
    servico_id: int
    inicio: datetime

class AgendamentoStatusUpdate(BaseModel):
    status: str
    motivo: Optional[str] = None

class AgendamentoResponse(BaseModel):
    id: int
    cliente_id: int
    prestador_id: int
    servico_id: int
    inicio: datetime
    status: str

    class Config:
        from_attributes = True

class HistoricoResponse(BaseModel):
    id: int
    agendamento_id: int
    usuario_id: int
    status_anterior: Optional[str]
    status_novo: str
    motivo: Optional[str]
    data_hora: datetime

    class Config:
        from_attributes = True