from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    AUTH_SERVICE_URL: str = "http://auth:8001"
    CATALOGO_SERVICE_URL: str = "http://catalogo:8002"

    AUTH_DB_HOST: str
    AUTH_DB_PORT: str
    AUTH_DB_NAME: str
    AUTH_DB_USER: str
    AUTH_DB_PASSWORD: str

    CATALOGO_DB_HOST: str
    CATALOGO_DB_PORT: str
    CATALOGO_DB_NAME: str
    CATALOGO_DB_USER: str
    CATALOGO_DB_PASSWORD: str

    AGENDAMENTOS_DB_HOST: str
    AGENDAMENTOS_DB_PORT: str
    AGENDAMENTOS_DB_NAME: str
    AGENDAMENTOS_DB_USER: str
    AGENDAMENTOS_DB_PASSWORD: str

    NOTIFICACOES_DB_HOST: str
    NOTIFICACOES_DB_PORT: str
    NOTIFICACOES_DB_NAME: str
    NOTIFICACOES_DB_USER: str
    NOTIFICACOES_DB_PASSWORD: str

    def _url(self, prefix: str) -> str:
        host = getattr(self, f"{prefix}_DB_HOST")
        port = getattr(self, f"{prefix}_DB_PORT")
        name = getattr(self, f"{prefix}_DB_NAME")
        user = getattr(self, f"{prefix}_DB_USER")
        password = getattr(self, f"{prefix}_DB_PASSWORD")
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"

    @property
    def database_urls(self) -> dict:
        # As chaves correspondem aos valores aceitos pelo query param ?banco=
        return {
            "auth": self._url("AUTH"),
            "catalogo": self._url("CATALOGO"),
            "agendamentos": self._url("AGENDAMENTOS"),
            "notificacoes": self._url("NOTIFICACOES"),
        }

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
