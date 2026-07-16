from pydantic import BaseModel
from datetime import datetime

class NotificacaoBase(BaseModel):
    mensagem: str

class NotificacaoCreate(NotificacaoBase):
    usuario_id: int

class NotificacaoResponse(NotificacaoBase):
    id: int
    usuario_id: int
    status: str
    criado_em: datetime

    class Config:
        from_attributes = True