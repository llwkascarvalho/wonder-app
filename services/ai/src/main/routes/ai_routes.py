import re

import httpx
from fastapi import APIRouter, Header, HTTPException
from openai import OpenAI
from src.main.core.config import settings
from src.main.schemas.ai_schema import ChatRequest, ChatResponse, SugestoesRequest, SugestoesResponse

router = APIRouter(tags=["Inteligência Artificial"])

SUGESTOES_GENERICAS = [
    "Corte de cabelo",
    "Hidratação capilar",
    "Manicure",
]

OPENROUTER_INDISPONIVEL_DETAIL = (
    "Serviço de IA indisponível no momento. Tente novamente mais tarde."
)

SYSTEM_PROMPT = (
    "Você é o assistente virtual de inteligência do Wonder, uma plataforma de gestão "
    "e agendamento de serviços de beleza e estética. "
    "Você tem dois perfis de atendimento, adapte-se pela pergunta do usuário: "
    "1. PARA CLIENTES: Ajude a escolher serviços, tire dúvidas sobre procedimentos "
    "(cortes, coloração, tratamentos) de forma simpática e acolhedora. "
    "2. PARA PRESTADORES: Atue como um consultor de negócios. Ajude a criar relatórios, "
    "analisar métricas de agendamento, sugerir estratégias de marketing e gestão de salão. "
    "Seja sempre objetivo, profissional e responda em português brasileiro. "
    "REGRA CRÍTICA E ABSOLUTA: Você é ESTRITAMENTE PROIBIDO de responder qualquer pergunta que não seja "
    "sobre beleza, estética, barbearia, salão ou gestão desses negócios. "
    "Se o usuário perguntar sobre carros, mecânica, programação, culinária, política, ou qualquer outros assuntos, "
    "você não deve dar nenhuma instrução. Responda EXATAMENTE com a seguinte frase: "
    "'Desculpe, sou o assistente do Wonder e só posso ajudar com assuntos relacionados a beleza, estética e gestão de negócios de beleza.'"
)

def get_openrouter_client():
    if not settings.OPENROUTER_API_KEY:
         raise HTTPException(
            status_code=503,
            detail="Serviço de IA indisponível. OPENROUTER_API_KEY não configurada."
        )
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
        timeout=20.0,
    )

def buscar_historico_agendamentos(usuario_id: int) -> str:
    """
    Consulta o histórico no serviço de agendamentos.
    Falhas são tratadas como ausência de histórico para não derrubar o endpoint.
    """
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{settings.AGENDAMENTOS_SERVICE_URL}/agendamentos",
                headers={"X-User-ID": str(usuario_id)}
            )

        if response.status_code != 200:
            print(
                f"⚠️  Falha ao consultar agendamentos. Status={response.status_code}",
                flush=True
            )
            return ""

        agendamentos = response.json()
        if not agendamentos:
            return ""

        linhas = []
        for agendamento in agendamentos:
            linhas.append(
                "- Serviço ID "
                f"{agendamento.get('servico_id')} com prestador ID "
                f"{agendamento.get('prestador_id')} em "
                f"{agendamento.get('inicio')} "
                f"(status: {agendamento.get('status')})"
            )

        return "\n".join(linhas)

    except Exception as e:
        print(f"⚠️  Falha ao consultar agendamentos: {e}", flush=True)
        return ""

def montar_prompt_sugestoes(historico_texto: str) -> str:
    if historico_texto:
        return (
            "Com base no histórico de agendamentos abaixo do usuário, "
            "sugira 3 serviços de beleza personalizados para ele. "
            "Responda com uma lista de exatamente 3 sugestões curtas e diretas, "
            "uma por linha.\n\n"
            f"Histórico:\n{historico_texto}"
        )

    return (
        "O usuário ainda não possui histórico de agendamentos. "
        "Sugira 3 serviços de beleza populares para novos clientes. "
        "Responda com uma lista de exatamente 3 sugestões curtas e diretas, "
        "uma por linha."
    )

def extrair_sugestoes(texto: str) -> list[str]:
    sugestoes = []

    for linha in texto.strip().splitlines():
        sugestao = re.sub(r"^\s*[-•*\d.)]+\s*", "", linha).strip()
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
def chat(request: ChatRequest):

    client = get_openrouter_client()

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.mensagem}
            ],
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Wonder App",
            }
        )
        
        texto_resposta = response.choices[0].message.content
        return ChatResponse(resposta=texto_resposta)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar resposta do OpenRouter: {str(e)}"
        )

@router.post("/ai/sugestoes", response_model=SugestoesResponse)
def sugestoes(
    request: SugestoesRequest | None = None,
    x_user_id: int | None = Header(None, alias="X-User-ID")
):
    """
    Gera 3 sugestões de serviços de beleza.
    Prioriza o X-User-ID injetado pelo Gateway e mantém user_id no body apenas
    para compatibilidade em chamadas diretas ao serviço.
    """
    usuario_id = x_user_id or (request.user_id if request else None)

    if usuario_id is None:
        raise HTTPException(status_code=400, detail="Usuário não informado.")

    client = get_openrouter_client()
    historico_texto = buscar_historico_agendamentos(usuario_id)
    prompt = montar_prompt_sugestoes(historico_texto)

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Wonder App",
            }
        )

        texto_resposta = response.choices[0].message.content or ""
        sugestoes_lista = extrair_sugestoes(texto_resposta)

        sugestoes_lista = completar_sugestoes(sugestoes_lista)

        return SugestoesResponse(sugestoes=sugestoes_lista)

    except Exception as e:
        print(f"⚠️  Falha ao consultar OpenRouter em /ai/sugestoes: {e}", flush=True)
        raise HTTPException(
            status_code=503,
            detail=OPENROUTER_INDISPONIVEL_DETAIL
        )
