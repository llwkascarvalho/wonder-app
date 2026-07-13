from typing import Optional

from pydantic import BaseModel, ConfigDict

class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    tipo_usuario: str

    model_config = ConfigDict(from_attributes=True)

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

class TipoUpdate(BaseModel):
    tipo_usuario: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
