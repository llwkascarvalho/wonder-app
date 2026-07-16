from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    NOTIFICACOES_DB_HOST: str
    NOTIFICACOES_DB_PORT: str
    NOTIFICACOES_DB_NAME: str
    NOTIFICACOES_DB_USER: str
    NOTIFICACOES_DB_PASSWORD: str
    
    RABBITMQ_HOST: str
    RABBITMQ_PORT: str
    RABBITMQ_USER: str
    RABBITMQ_PASSWORD: str
    RABBITMQ_QUEUE: str = "wonder.eventos"
    RABBITMQ_EXCHANGE: str = ""
    RABBITMQ_ROUTING_KEY: str = "wonder.eventos"
    RABBITMQ_MAX_RETRIES: int = 3
    CATALOGO_URL: str = "http://catalogo:8002"

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.NOTIFICACOES_DB_USER}:{self.NOTIFICACOES_DB_PASSWORD}@{self.NOTIFICACOES_DB_HOST}:{self.NOTIFICACOES_DB_PORT}/{self.NOTIFICACOES_DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
