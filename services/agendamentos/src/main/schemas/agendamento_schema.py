from pydantic import BaseModel
from datetime import date, datetime
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
    cliente_nome: Optional[str] = None
    cliente_foto_url: Optional[str] = None

    class Config:
        from_attributes = True

class HorarioDisponivelResponse(BaseModel):
    inicio: datetime
    fim: datetime

class DisponibilidadeResponse(BaseModel):
    prestador_id: int
    servico_id: int
    data: date
    duracao_min: int
    horarios: list[HorarioDisponivelResponse]

class DiaDisponivelResponse(BaseModel):
    data: date
    disponivel: bool

class DiasDisponiveisResponse(BaseModel):
    prestador_id: int
    servico_id: int
    mes: str
    dias: list[DiaDisponivelResponse]

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
