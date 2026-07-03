from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class LogAuditoriaResponse(BaseModel):
    id: str
    banco: str
    usuario_id: Optional[int] = None
    operacao: str
    tabela_afetada: str
    dados_antigos: Optional[dict] = None
    dados_novos: Optional[dict] = None
    data_hora: datetime


class ResumoAuditoriaItem(BaseModel):
    banco: str
    operacao: str
    total: int
