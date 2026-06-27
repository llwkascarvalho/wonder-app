from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENROUTER_API_KEY: Optional[str] = None
    AGENDAMENTOS_SERVICE_URL: str = "http://agendamentos:8003"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
