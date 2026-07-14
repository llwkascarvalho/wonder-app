import json
from urllib.error import URLError
from urllib.request import Request as UrlRequest, urlopen

from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query
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
    DiasDisponiveisResponse,
    DiaDisponivelResponse,
    DisponibilidadeResponse,
    HorarioDisponivelResponse,
)
from src.main.services.disponibilidade_service import (
    calcular_dias_disponiveis,
    calcular_disponibilidade,
)

router = APIRouter(tags=["Agendamentos"])


def catalogo_headers(usuario_id: int, tipo_usuario: str) -> dict[str, str]:
    return {
        "X-User-ID": str(usuario_id),
        "X-User-Role": tipo_usuario,
    }


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

def obter_cliente_publico(cliente_id: int, cache: dict[int, dict | None]) -> dict | None:
    if cliente_id in cache:
        return cache[cliente_id]

    request = UrlRequest(
        f"{settings.AUTH_URL}/auth/internal/usuarios/{cliente_id}/publico",
        headers={"X-Internal-Service": "agendamentos"},
    )

    try:
        with urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError):
        cache[cliente_id] = None
        return None

    cache[cliente_id] = payload
    return payload


def enriquecer_agendamentos_cliente(agendamentos: list) -> list[AgendamentoResponse]:
    cache: dict[int, dict | None] = {}
    respostas: list[AgendamentoResponse] = []

    for agendamento in agendamentos:
        cliente = obter_cliente_publico(agendamento.cliente_id, cache)
        respostas.append(
            AgendamentoResponse(
                id=agendamento.id,
                cliente_id=agendamento.cliente_id,
                prestador_id=agendamento.prestador_id,
                servico_id=agendamento.servico_id,
                inicio=agendamento.inicio,
                status=agendamento.status,
                cliente_nome=cliente.get("nome") if cliente else None,
                cliente_foto_url=cliente.get("foto_url") if cliente else None,
            )
        )

    return respostas


@router.get("/agendamentos/dias-disponiveis", response_model=DiasDisponiveisResponse)
def route_dias_disponiveis(
    prestador_id: int,
    servico_id: int,
    mes: str = Query(..., description="Mes no formato YYYY-MM"),
    x_user_id: int = Header(..., alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    servico, dias = calcular_dias_disponiveis(
        db,
        prestador_id,
        servico_id,
        mes,
        catalogo_headers(x_user_id, x_user_role.lower()),
    )
    return DiasDisponiveisResponse(
        prestador_id=prestador_id,
        servico_id=servico.id,
        mes=mes,
        dias=[DiaDisponivelResponse(data=dia, disponivel=True) for dia in dias],
    )


@router.get("/agendamentos/disponibilidade", response_model=DisponibilidadeResponse)
def route_disponibilidade(
    prestador_id: int,
    servico_id: int,
    data: date,
    x_user_id: int = Header(..., alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    servico, slots = calcular_disponibilidade(
        db,
        prestador_id,
        servico_id,
        data,
        catalogo_headers(x_user_id, x_user_role.lower()),
    )
    return DisponibilidadeResponse(
        prestador_id=prestador_id,
        servico_id=servico.id,
        data=data,
        duracao_min=servico.duracao_min,
        horarios=[HorarioDisponivelResponse(inicio=slot.inicio, fim=slot.fim) for slot in slots],
    )


@router.get("/agendamentos", response_model=list[AgendamentoResponse])
def route_listar(
    data: date | None = None,
    x_user_id: int = Header(..., alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    """Lista agendamentos conforme o papel do usuario logado."""
    tipo_usuario = x_user_role.lower()
    prestador_ids = listar_prestadores_usuario(x_user_id, tipo_usuario)
    agendamentos = listar_agendamentos(db, x_user_id, tipo_usuario, prestador_ids, data)

    if tipo_usuario == "prestador":
        return enriquecer_agendamentos_cliente(agendamentos)

    return agendamentos


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
    x_user_role: str = Header("cliente", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    return criar_agendamento(db, dados, x_user_id, catalogo_headers(x_user_id, x_user_role.lower()))


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
