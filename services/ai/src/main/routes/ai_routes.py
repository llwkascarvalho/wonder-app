from fastapi import APIRouter, HTTPException
from openai import OpenAI
from src.main.core.config import settings
from src.main.schemas.ai_schema import ChatRequest, ChatResponse

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