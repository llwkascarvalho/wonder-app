import calendar
import json
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.main.core.config import settings
from src.main.models.agendamento_model import Agendamento

BLOQUEIA_AGENDA = {"pendente", "confirmado"}


@dataclass(frozen=True)
class ServicoCatalogo:
    id: int
    prestador_id: int
    duracao_min: int


@dataclass(frozen=True)
class HorarioFuncionamentoCatalogo:
    dia_semana: int
    hora_inicio: time
    hora_fim: time


@dataclass(frozen=True)
class SlotDisponivel:
    inicio: datetime
    fim: datetime


def calcular_disponibilidade(
    db: Session,
    prestador_id: int,
    servico_id: int,
    data: date,
    headers: dict[str, str],
) -> tuple[ServicoCatalogo, list[SlotDisponivel]]:
    servicos = buscar_servicos_catalogo(prestador_id, headers)
    servico = obter_servico_solicitado(servicos, prestador_id, servico_id)
    horarios = buscar_horarios_catalogo(prestador_id, headers)
    agendamentos = listar_agendamentos_bloqueadores_do_dia(db, prestador_id, data)
    duracoes_por_servico = {item.id: item.duracao_min for item in servicos}

    slots = gerar_slots_disponiveis(
        data=data,
        duracao_min=servico.duracao_min,
        horarios=horarios,
        agendamentos=agendamentos,
        duracoes_por_servico=duracoes_por_servico,
    )
    return servico, slots


def calcular_dias_disponiveis(
    db: Session,
    prestador_id: int,
    servico_id: int,
    mes: str,
    headers: dict[str, str],
) -> tuple[ServicoCatalogo, list[date]]:
    ano, numero_mes = parse_mes(mes)
    servicos = buscar_servicos_catalogo(prestador_id, headers)
    servico = obter_servico_solicitado(servicos, prestador_id, servico_id)
    horarios = buscar_horarios_catalogo(prestador_id, headers)
    duracoes_por_servico = {item.id: item.duracao_min for item in servicos}
    ultimo_dia = calendar.monthrange(ano, numero_mes)[1]
    dias: list[date] = []

    for dia in range(1, ultimo_dia + 1):
        data = date(ano, numero_mes, dia)
        agendamentos = listar_agendamentos_bloqueadores_do_dia(db, prestador_id, data)
        slots = gerar_slots_disponiveis(
            data=data,
            duracao_min=servico.duracao_min,
            horarios=horarios,
            agendamentos=agendamentos,
            duracoes_por_servico=duracoes_por_servico,
        )
        if slots:
            dias.append(data)

    return servico, dias


def validar_intervalo_para_criacao(
    db: Session,
    prestador_id: int,
    servico_id: int,
    inicio: datetime,
    headers: dict[str, str],
) -> ServicoCatalogo:
    servico, slots = calcular_disponibilidade(db, prestador_id, servico_id, inicio.date(), headers)

    if not any(slot.inicio == inicio for slot in slots):
        raise HTTPException(status_code=409, detail="Este horario nao esta mais disponivel.")

    return servico


def adquirir_lock_prestador(db: Session, prestador_id: int) -> None:
    db.execute(text("SELECT pg_advisory_xact_lock(:prestador_id)"), {"prestador_id": prestador_id})


def gerar_slots_disponiveis(
    data: date,
    duracao_min: int,
    horarios: list[HorarioFuncionamentoCatalogo],
    agendamentos: list[Agendamento],
    duracoes_por_servico: dict[int, int],
) -> list[SlotDisponivel]:
    if duracao_min <= 0:
        raise HTTPException(status_code=422, detail="Duracao do servico invalida.")

    agora = datetime.now()
    duracao = timedelta(minutes=duracao_min)
    dia_semana = dia_semana_catalogo(data)
    slots: list[SlotDisponivel] = []

    for horario in horarios:
        if horario.dia_semana != dia_semana:
            continue

        inicio_janela = datetime.combine(data, horario.hora_inicio)
        fim_janela = datetime.combine(data, horario.hora_fim)
        inicio_slot = inicio_janela

        while inicio_slot + duracao <= fim_janela:
            fim_slot = inicio_slot + duracao
            if inicio_slot >= agora and not possui_sobreposicao(
                inicio_slot,
                fim_slot,
                agendamentos,
                duracoes_por_servico,
            ):
                slots.append(SlotDisponivel(inicio=inicio_slot, fim=fim_slot))
            inicio_slot += duracao

    return slots


def possui_sobreposicao(
    inicio: datetime,
    fim: datetime,
    agendamentos: list[Agendamento],
    duracoes_por_servico: dict[int, int],
) -> bool:
    for agendamento in agendamentos:
        duracao_existente = duracoes_por_servico.get(agendamento.servico_id)
        if duracao_existente is None:
            raise HTTPException(status_code=503, detail="Servico de Catalogo indisponivel para validar agenda.")

        inicio_existente = agendamento.inicio
        fim_existente = inicio_existente + timedelta(minutes=duracao_existente)

        if inicio_existente < fim and fim_existente > inicio:
            return True

    return False


def listar_agendamentos_bloqueadores_do_dia(db: Session, prestador_id: int, data: date) -> list[Agendamento]:
    inicio_dia = datetime.combine(data, time.min)
    fim_dia = inicio_dia + timedelta(days=1)

    return (
        db.query(Agendamento)
        .filter(
            Agendamento.prestador_id == prestador_id,
            Agendamento.inicio >= inicio_dia,
            Agendamento.inicio < fim_dia,
            Agendamento.status.in_(BLOQUEIA_AGENDA),
        )
        .order_by(Agendamento.inicio)
        .all()
    )


def buscar_servicos_catalogo(prestador_id: int, headers: dict[str, str]) -> list[ServicoCatalogo]:
    payload = chamar_catalogo_json(f"/catalogo/prestadores/{prestador_id}/servicos", headers)
    servicos = []

    for item in payload:
        servicos.append(
            ServicoCatalogo(
                id=int(item["id"]),
                prestador_id=int(item["prestador_id"]),
                duracao_min=int(item["duracao_min"]),
            )
        )

    return servicos


def buscar_horarios_catalogo(prestador_id: int, headers: dict[str, str]) -> list[HorarioFuncionamentoCatalogo]:
    payload = chamar_catalogo_json(f"/catalogo/prestadores/{prestador_id}/horarios", headers)
    horarios = []

    for item in payload:
        horarios.append(
            HorarioFuncionamentoCatalogo(
                dia_semana=int(item["dia_semana"]),
                hora_inicio=parse_time(item["hora_inicio"]),
                hora_fim=parse_time(item["hora_fim"]),
            )
        )

    return horarios


def chamar_catalogo_json(path: str, headers: dict[str, str]):
    request = UrlRequest(f"{settings.CATALOGO_URL}{path}", headers=headers)

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 404:
            raise HTTPException(status_code=404, detail="Servico ou prestador nao encontrado.")
        raise HTTPException(status_code=503, detail=f"Servico de Catalogo indisponivel: HTTP {exc.code}")
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail=f"Servico de Catalogo indisponivel: {exc}")


def obter_servico_solicitado(
    servicos: list[ServicoCatalogo],
    prestador_id: int,
    servico_id: int,
) -> ServicoCatalogo:
    for servico in servicos:
        if servico.id == servico_id and servico.prestador_id == prestador_id:
            return servico

    raise HTTPException(status_code=404, detail="Servico nao encontrado para este prestador.")


def parse_time(value: str) -> time:
    try:
        return time.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=503, detail="Horario de funcionamento invalido no Catalogo.")


def parse_mes(mes: str) -> tuple[int, int]:
    try:
        parsed = datetime.strptime(mes, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=422, detail="Mes invalido. Use o formato YYYY-MM.")

    return parsed.year, parsed.month


def dia_semana_catalogo(data: date) -> int:
    return (data.weekday() + 1) % 7
