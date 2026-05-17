from fastapi import APIRouter, HTTPException, Header
from openai import OpenAI
import httpx
import os
from src.main.core.config import settings
from src.main.schemas.ai_schema import ChatRequest, ChatResponse, SugestoesResponse

router = APIRouter(tags=["Inteligência Artificial"])

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

# URL interna do serviço de agendamentos na rede Docker
AGENDAMENTOS_URL = os.getenv("AGENDAMENTOS_SERVICE_URL", "http://agendamentos:8003")


def get_openrouter_client():
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Serviço de IA indisponível. OPENROUTER_API_KEY não configurada."
        )
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )



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


# ─── /ai/sugestoes ─────────────────────────────────────────────────

@router.post("/ai/sugestoes", response_model=SugestoesResponse)
def sugestoes(x_user_id: int = Header(..., alias="X-User-ID")):
    """
    Gera sugestões personalizadas de serviços de beleza com base no histórico
    de agendamentos do usuário. O serviço de AI consulta internamente o serviço
    de agendamentos usando o X-User-ID. Se o usuário não tiver histórico,
    retorna sugestões genéricas de serviços populares.
    Endpoint protegido pelo Gateway — exige JWT válido.
    """
    client = get_openrouter_client()

    # 1. Busca histórico de agendamentos do usuário no serviço de agendamentos
    historico_texto = ""
    try:
        with httpx.Client(timeout=5.0) as http:
            response = http.get(
                f"{AGENDAMENTOS_URL}/agendamentos",
                headers={"X-User-ID": str(x_user_id)}
            )
            if response.status_code == 200:
                agendamentos = response.json()
                if agendamentos:
                    linhas = []
                    for ag in agendamentos:
                        linhas.append(
                            f"- Serviço ID {ag.get('servico_id')} com prestador ID "
                            f"{ag.get('prestador_id')} em {ag.get('inicio')} "
                            f"(status: {ag.get('status')})"
                        )
                    historico_texto = "\n".join(linhas)
    except Exception as e:
        print(f"⚠️  Falha ao consultar agendamentos: {e}", flush=True)

    # 2. Monta o prompt com ou sem histórico
    if historico_texto:
        prompt = (
            f"Com base no histórico de agendamentos abaixo do usuário, "
            f"sugira 3 serviços de beleza personalizados para ele. "
            f"Responda com uma lista de exatamente 3 sugestões curtas e diretas.\n\n"
            f"Histórico:\n{historico_texto}"
        )
    else:
        prompt = (
            "O usuário ainda não possui histórico de agendamentos. "
            "Sugira 3 serviços de beleza populares para novos clientes. "
            "Responda com uma lista de exatamente 3 sugestões curtas e diretas."
        )

    # 3. Chama o Gemini via OpenRouter
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
        texto = response.choices[0].message.content

        # 4. Transforma o texto em lista de sugestões
        linhas = [
            linha.strip().lstrip("-•123456789. ")
            for linha in texto.strip().split("\n")
            if linha.strip()
        ]
        sugestoes_lista = linhas[:3] if len(linhas) >= 3 else linhas

        return SugestoesResponse(sugestoes=sugestoes_lista)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar sugestões do OpenRouter: {str(e)}"
        )
