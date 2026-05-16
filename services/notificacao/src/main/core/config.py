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

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.NOTIFICACOES_DB_USER}:{self.NOTIFICACOES_DB_PASSWORD}@{self.NOTIFICACOES_DB_HOST}:{self.NOTIFICACOES_DB_PORT}/{self.NOTIFICACOES_DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()