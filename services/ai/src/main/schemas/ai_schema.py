from pydantic import BaseModel

class ChatRequest(BaseModel):
    mensagem: str

class ChatResponse(BaseModel):
    resposta: str