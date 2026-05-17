from fastapi import APIRouter, Depends, Request, Header
from sqlalchemy.orm import Session
from src.main.dependencies.db import get_db
from src.main.schemas.agendamento_schema import (
    AgendamentoCreate,
    AgendamentoResponse,
    AgendamentoStatusUpdate,
    HistoricoResponse,
)
from src.main.repositories.agendamento_repo import (
    listar_agendamentos,
    obter_agendamento,
    criar_agendamento,
    atualizar_status,
)

router = APIRouter(tags=["Agendamentos"])


@router.get("/agendamentos", response_model=list[AgendamentoResponse])
def route_listar(
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Lista todos os agendamentos do usuário logado."""
    return listar_agendamentos(db, x_user_id)


@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def route_obter(
    agendamento_id: int,
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Retorna detalhes de um agendamento específico do usuário logado."""
    return obter_agendamento(db, agendamento_id, x_user_id)


@router.post("/agendamentos", response_model=AgendamentoResponse, status_code=201)
def route_criar(
    dados: AgendamentoCreate,
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """
    Cria um novo agendamento.
    Controle de concorrência via SELECT FOR UPDATE impede double booking.
    Após criação, publica evento no RabbitMQ para o serviço de Notificação.
    """
    return criar_agendamento(db, dados, x_user_id)


@router.patch("/agendamentos/{agendamento_id}/status", response_model=AgendamentoResponse)
def route_atualizar_status(
    agendamento_id: int,
    dados: AgendamentoStatusUpdate,
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """
    Atualiza o status de um agendamento (confirmar, cancelar, concluir).
    Registra histórico com status_anterior e status_novo.
    O UPDATE e o INSERT disparam triggers de auditoria automaticamente.
    Retorna 404 se o agendamento não existir ou não pertencer ao usuário logado.
    """
    return atualizar_status(db, agendamento_id, x_user_id, dados)
