from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from src.main.dependencies.db import get_db
from src.main.schemas.agendamento_schema import (
    AgendamentoCreate,
    AgendamentoResponse,
)
from src.main.repositories.agendamento_repo import (
    listar_agendamentos,
    obter_agendamento,
    criar_agendamento,
)

router = APIRouter(tags=["Agendamentos"])

def get_cliente_id(request: Request) -> int:
    """Extrai o ID do usuário logado do header injetado pelo Gateway."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Usuário não identificado.")
    return int(user_id)

@router.get("/agendamentos", response_model=list[AgendamentoResponse])
def route_listar(request: Request, db: Session = Depends(get_db)):
    """Lista todos os agendamentos do usuário logado."""
    cliente_id = get_cliente_id(request)
    return listar_agendamentos(db, cliente_id)

@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def route_obter(agendamento_id: int, request: Request, db: Session = Depends(get_db)):
    """Retorna detalhes de um agendamento específico do usuário logado."""
    cliente_id = get_cliente_id(request)
    return obter_agendamento(db, agendamento_id, cliente_id)

@router.post("/agendamentos", response_model=AgendamentoResponse, status_code=201)
def route_criar(
    dados: AgendamentoCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Cria um novo agendamento.
    Controle de concorrência via SELECT FOR UPDATE impede double booking.
    Após criação, publica evento no RabbitMQ para o serviço de Notificação.
    """
    cliente_id = get_cliente_id(request)
    return criar_agendamento(db, dados, cliente_id)