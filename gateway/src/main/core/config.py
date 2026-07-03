from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict

class Settings(BaseSettings):
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    AUTH_SERVICE_URL: str = "http://auth:8001"
    CATALOGO_SERVICE_URL: str = "http://catalogo:8002"
    AGENDAMENTOS_SERVICE_URL: str = "http://agendamentos:8003"
    NOTIFICACAO_SERVICE_URL: str = "http://notificacao:8004"
    AI_SERVICE_URL: str = "http://ai:8005"
    ADMIN_SERVICE_URL: str = "http://admin:8006"

    @property
    def services(self) -> Dict[str, str]:
        return {
            "auth": self.AUTH_SERVICE_URL,
            "catalogo": self.CATALOGO_SERVICE_URL,
            "agendamentos": self.AGENDAMENTOS_SERVICE_URL,
            "notificacao": self.NOTIFICACAO_SERVICE_URL,
            "ai": self.AI_SERVICE_URL,
            "admin": self.ADMIN_SERVICE_URL,
        }

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()