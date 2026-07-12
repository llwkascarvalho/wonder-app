from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, Field


class ServicoResponse(BaseModel):
    id: int
    prestador_id: int
    nome: str
    preco: float
    duracao_min: int
    categoria_id: Optional[int] = None


class HorarioResponse(BaseModel):
    id: int
    prestador_id: int
    dia_semana: int
    hora_inicio: time
    hora_fim: time


class PrestadorResponse(BaseModel):
    id: int
    usuario_id: int | str
    nome_estab: str
    documento: str
    status: str
    enviado_em: Optional[datetime] = None
    aprovado_em: Optional[datetime] = None
    aprovado_por: Optional[str] = None
    motivo_rejeicao: Optional[str] = None


class PrestadorDetalheResponse(PrestadorResponse):
    servicos: list[ServicoResponse] = Field(default_factory=list)
    horarios: list[HorarioResponse] = Field(default_factory=list)


class PrestadorStatusUpdate(BaseModel):
    status: str
    motivo_rejeicao: Optional[str] = None
