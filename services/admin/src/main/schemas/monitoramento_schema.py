from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class QueryLentaItem(BaseModel):
    query: str
    calls: int
    total_exec_time: float
    mean_exec_time: float
    rows: int


class ConexaoAtivaItem(BaseModel):
    pid: int
    usuario: Optional[str] = None
    aplicacao: Optional[str] = None
    cliente: Optional[str] = None
    estado: Optional[str] = None
    wait_event_type: Optional[str] = None
    duracao_segundos: Optional[float] = None
    query: Optional[str] = None


class DeadTupleItem(BaseModel):
    schema_name: str
    tabela: str
    live_tuples: int
    dead_tuples: int
    last_vacuum: Optional[datetime] = None
    last_autovacuum: Optional[datetime] = None


class MonitoramentoBancoResponse(BaseModel):
    banco: str
    queries_lentas: list[QueryLentaItem]
    conexoes_ativas: list[ConexaoAtivaItem]
    tabelas_dead_tuples: list[DeadTupleItem]
    erro: Optional[str] = None
