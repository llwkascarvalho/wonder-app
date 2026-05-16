from pydantic import BaseModel

class UsuarioResponse(BaseModel):
    id: int
    email: str
    tipo_usuario: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse