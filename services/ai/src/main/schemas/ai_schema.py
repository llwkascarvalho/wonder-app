from pydantic import BaseModel

class ChatRequest(BaseModel):
    mensagem: str

class ChatResponse(BaseModel):
    resposta: str

class SugestoesRequest(BaseModel):
    user_id: int | None = None

class SugestoesResponse(BaseModel):
    sugestoes: list[str]
