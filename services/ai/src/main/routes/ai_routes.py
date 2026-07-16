import re
from collections import Counter
from datetime import date, datetime, time, timedelta

import httpx
from fastapi import APIRouter, Header, HTTPException
from openai import OpenAI

from src.main.core.config import settings
from src.main.schemas.ai_schema import ChatRequest, ChatResponse, SugestoesRequest, SugestoesResponse

router = APIRouter(tags=["Inteligencia Artificial"])

SUGESTOES_GENERICAS = [
    "Corte de cabelo",
    "Hidratacao capilar",
    "Manicure",
]

OPENROUTER_INDISPONIVEL_DETAIL = (
    "Servico de IA indisponivel no momento. Tente novamente mais tarde."
)

SYSTEM_PROMPT = (
    "Voce e o assistente virtual de inteligencia do Wonder, uma plataforma de gestao "
    "e agendamento de servicos de beleza e estetica. "
    "Para clientes, ajude a escolher servicos e tire duvidas sobre procedimentos. "
    "Para prestadores, atue como consultor de negocios, usando metricas reais quando disponiveis. "
    "Responda em portugues brasileiro, de forma objetiva e profissional. "
    "Se a pergunta nao for sobre beleza, estetica, barbearia, salao ou gestao desses negocios, "
    "responda exatamente: 'Desculpe, sou o assistente do Wonder e so posso ajudar com assuntos relacionados a beleza, estetica e gestao de negocios de beleza.'"
)


def get_openrouter_client():
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Servico de IA indisponivel. OPENROUTER_API_KEY nao configurada.",
        )

    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
        timeout=20.0,
    )


def headers_usuario(usuario_id: int, tipo_usuario: str = "cliente") -> dict[str, str]:
    return {
        "X-User-ID": str(usuario_id),
        "X-User-Role": tipo_usuario,
    }


def buscar_agendamentos(usuario_id: int, tipo_usuario: str = "cliente") -> list[dict]:
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{settings.AGENDAMENTOS_SERVICE_URL}/agendamentos",
                headers=headers_usuario(usuario_id, tipo_usuario),
            )

        if response.status_code != 200:
            print(f"Falha ao consultar agendamentos. Status={response.status_code}", flush=True)
            return []

        payload = response.json()
        return payload if isinstance(payload, list) else []
    except Exception as exc:
        print(f"Falha ao consultar agendamentos: {exc}", flush=True)
        return []


def buscar_historico_agendamentos(usuario_id: int, tipo_usuario: str = "cliente") -> str:
    agendamentos = buscar_agendamentos(usuario_id, tipo_usuario)
    if not agendamentos:
        return ""

    linhas = []
    for agendamento in agendamentos:
        linhas.append(
            "- Servico ID "
            f"{agendamento.get('servico_id')} com prestador ID "
            f"{agendamento.get('prestador_id')} em "
            f"{agendamento.get('inicio')} "
            f"(status: {agendamento.get('status')})"
        )

    return "\n".join(linhas)


def mensagem_pede_relatorio(mensagem: str) -> bool:
    texto = mensagem.lower()
    return "relatorio" in texto or "relatório" in texto


def periodo_relatorio(mensagem: str) -> tuple[str, datetime, datetime]:
    hoje = date.today()
    texto = mensagem.lower()

    if "seman" in texto:
        inicio = hoje - timedelta(days=hoje.weekday())
        fim = inicio + timedelta(days=7)
        return "semanal", datetime.combine(inicio, time.min), datetime.combine(fim, time.min)

    inicio = datetime.combine(hoje, time.min)
    fim = inicio + timedelta(days=1)
    return "diario", inicio, fim


def parse_inicio(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def buscar_servico(prestador_id: int, servico_id: int, usuario_id: int, tipo_usuario: str) -> dict | None:
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{settings.CATALOGO_SERVICE_URL}/catalogo/prestadores/{prestador_id}/servicos",
                headers=headers_usuario(usuario_id, tipo_usuario),
            )

        if response.status_code != 200:
            return None

        servicos = response.json()
        if not isinstance(servicos, list):
            return None

        for servico in servicos:
            if str(servico.get("id")) == str(servico_id):
                return servico
    except Exception as exc:
        print(f"Falha ao consultar servico no Catalogo: {exc}", flush=True)

    return None


def montar_relatorio_operacional(mensagem: str, usuario_id: int, tipo_usuario: str) -> str:
    tipo_periodo, inicio_periodo, fim_periodo = periodo_relatorio(mensagem)
    agendamentos = buscar_agendamentos(usuario_id, tipo_usuario)
    agendamentos_periodo = [
        agendamento
        for agendamento in agendamentos
        if (inicio := parse_inicio(agendamento.get("inicio"))) is not None
        and inicio_periodo <= inicio < fim_periodo
    ]

    realizados = [
        agendamento
        for agendamento in agendamentos_periodo
        if str(agendamento.get("status")) in {"concluido", "finalizado"}
    ]
    cancelados = [
        agendamento
        for agendamento in agendamentos_periodo
        if str(agendamento.get("status")) == "cancelado"
    ]

    servicos_cache: dict[tuple[int, int], dict | None] = {}
    receita = 0.0
    servicos_realizados: list[str] = []

    for agendamento in realizados:
        prestador_id = int(agendamento.get("prestador_id"))
        servico_id = int(agendamento.get("servico_id"))
        chave = (prestador_id, servico_id)

        if chave not in servicos_cache:
            servicos_cache[chave] = buscar_servico(prestador_id, servico_id, usuario_id, tipo_usuario)

        servico = servicos_cache[chave]
        nome_servico = str(servico.get("nome")) if servico and servico.get("nome") else f"Servico {servico_id}"
        preco = float(servico.get("preco") or 0) if servico else 0.0
        receita += preco
        servicos_realizados.append(nome_servico)

    mais_realizado = "Sem servico concluido no periodo."
    if servicos_realizados:
        nome, total = Counter(servicos_realizados).most_common(1)[0]
        mais_realizado = f"{nome} ({total} atendimento(s))"

    periodo_label = (
        inicio_periodo.strftime("%d/%m/%Y")
        if tipo_periodo == "diario"
        else f"{inicio_periodo.strftime('%d/%m/%Y')} a {(fim_periodo - timedelta(days=1)).strftime('%d/%m/%Y')}"
    )

    return (
        f"Relatorio {tipo_periodo} do Wonder\n"
        f"Periodo: {periodo_label}\n\n"
        f"- Agendamentos no periodo: {len(agendamentos_periodo)}\n"
        f"- Agendamentos realizados: {len(realizados)}\n"
        f"- Agendamentos cancelados: {len(cancelados)}\n"
        f"- Receita estimada realizada: R$ {receita:.2f}\n"
        f"- Servico mais realizado: {mais_realizado}\n\n"
        "Observacao: a receita considera apenas agendamentos concluidos/finalizados "
        "e usa o preco atual do servico no Catalogo."
    )


def montar_prompt_sugestoes(historico_texto: str) -> str:
    if historico_texto:
        return (
            "Com base no historico de agendamentos abaixo do usuario, "
            "sugira 3 servicos de beleza personalizados para ele. "
            "Responda com uma lista de exatamente 3 sugestoes curtas e diretas, "
            "uma por linha.\n\n"
            f"Historico:\n{historico_texto}"
        )

    return (
        "O usuario ainda nao possui historico de agendamentos. "
        "Sugira 3 servicos de beleza populares para novos clientes. "
        "Responda com uma lista de exatamente 3 sugestoes curtas e diretas, "
        "uma por linha."
    )


def extrair_sugestoes(texto: str) -> list[str]:
    sugestoes = []

    for linha in texto.strip().splitlines():
        sugestao = re.sub(r"^\s*[-*\d.)]+\s*", "", linha).strip()
        if sugestao:
            sugestoes.append(sugestao)

    return sugestoes[:3]


def completar_sugestoes(sugestoes: list[str]) -> list[str]:
    sugestoes_completas = [sugestao for sugestao in sugestoes if sugestao]

    for sugestao_generica in SUGESTOES_GENERICAS:
        if len(sugestoes_completas) >= 3:
            break
        if sugestao_generica not in sugestoes_completas:
            sugestoes_completas.append(sugestao_generica)

    return sugestoes_completas[:3]


@router.post("/ai/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    x_user_id: int | None = Header(None, alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
):
    if mensagem_pede_relatorio(request.mensagem):
        if x_user_id is None:
            raise HTTPException(status_code=400, detail="Usuario nao informado para gerar relatorio.")
        return ChatResponse(
            resposta=montar_relatorio_operacional(request.mensagem, x_user_id, x_user_role.lower())
        )

    client = get_openrouter_client()

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.mensagem},
            ],
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Wonder App",
            },
        )

        texto_resposta = response.choices[0].message.content
        return ChatResponse(resposta=texto_resposta)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar resposta do OpenRouter: {str(exc)}",
        ) from exc


@router.post("/ai/sugestoes", response_model=SugestoesResponse)
def sugestoes(
    request: SugestoesRequest | None = None,
    x_user_id: int | None = Header(None, alias="X-User-ID"),
    x_user_role: str = Header("cliente", alias="X-User-Role"),
):
    usuario_id = x_user_id or (request.user_id if request else None)

    if usuario_id is None:
        raise HTTPException(status_code=400, detail="Usuario nao informado.")

    client = get_openrouter_client()
    historico_texto = buscar_historico_agendamentos(usuario_id, x_user_role.lower())
    prompt = montar_prompt_sugestoes(historico_texto)

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Wonder App",
            },
        )

        texto_resposta = response.choices[0].message.content or ""
        sugestoes_lista = completar_sugestoes(extrair_sugestoes(texto_resposta))

        return SugestoesResponse(sugestoes=sugestoes_lista)
    except Exception as exc:
        print(f"Falha ao consultar OpenRouter em /ai/sugestoes: {exc}", flush=True)
        raise HTTPException(
            status_code=503,
            detail=OPENROUTER_INDISPONIVEL_DETAIL,
        ) from exc
