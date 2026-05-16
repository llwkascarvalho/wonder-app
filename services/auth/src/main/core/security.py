from datetime import datetime, timedelta, timezone
from jose import jwt
from src.main.core.config import settings

def gerar_jwt(usuario_id: int, email: str, tipo_usuario: str) -> str:
    expiracao = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    payload = {
        "sub": str(usuario_id),
        "email": email,
        "tipo_usuario": tipo_usuario,
        "exp": expiracao
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)