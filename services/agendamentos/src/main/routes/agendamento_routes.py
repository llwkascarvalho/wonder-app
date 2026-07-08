import json
from urllib.error import URLError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from src.main.core.config import settings
from src.main.dependencies.db import get_db
from src.main.repositories.agendamento_repo import (
    atualizar_status,
    criar_agendamento,
    listar_agendamentos,
    obter_agendamento,
)
from src.main.schemas.agendamento_schema import (
    AgendamentoCreate,
    AgendamentoResponse,
    AgendamentoStatusUpdate,
)

router = APIRouter(tags=["Agendamentos"])


def listar_prestadores_usuario(usuario_id: int, tipo_usuario: str) -> list[int]:
    if tipo_usuario != "prestador":
        return []

    request = UrlRequest(
        f"{settings.CATALOGO_URL}/catalogo/prestadores",
        headers={
            "X-User-ID": str(usuario_id),
            "X-User-Role": tipo_usuario,
        },
    )

    try:
        with urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Servico de Catalogo indisponivel para resolver prestador: {exc}",
        )

    return [
        int(prestador["id"])
        for prestador in payload
        if str(prestador.get("usuario_id")) == str(usuario_id)
    ]


@router.get("/agendamentos", response_model=list[AgendamentoResponse])
def route_listar(
    x_user_id: int = Header(..., alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    """Lista agendamentos conforme o papel do usuario logado."""
    tipo_usuario = x_user_role.lower()
    prestador_ids = listar_prestadores_usuario(x_user_id, tipo_usuario)
    return listar_agendamentos(db, x_user_id, tipo_usuario, prestador_ids)


@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def route_obter(
    agendamento_id: int,
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    """Retorna detalhes de um agendamento especifico do cliente logado."""
    return obter_agendamento(db, agendamento_id, x_user_id)


@router.post("/agendamentos", response_model=AgendamentoResponse, status_code=201)
def route_criar(
    dados: AgendamentoCreate,
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    return criar_agendamento(db, dados, x_user_id)


@router.patch("/agendamentos/{agendamento_id}/status", response_model=AgendamentoResponse)
def route_atualizar_status(
    agendamento_id: int,
    dados: AgendamentoStatusUpdate,
    x_user_id: int = Header(..., alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    tipo_usuario = x_user_role.lower()
    prestador_ids = listar_prestadores_usuario(x_user_id, tipo_usuario)
    return atualizar_status(db, agendamento_id, x_user_id, dados, tipo_usuario, prestador_ids)
