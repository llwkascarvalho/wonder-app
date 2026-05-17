from pydantic import BaseModel
from typing import List


class ChatRequest(BaseModel):
    mensagem: str

class ChatResponse(BaseModel):
    resposta: str


class SugestoesResponse(BaseModel):
    sugestoes: List[str]
