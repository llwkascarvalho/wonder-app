from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    AGENDAMENTOS_DB_HOST: str
    AGENDAMENTOS_DB_PORT: str
    AGENDAMENTOS_DB_NAME: str
    AGENDAMENTOS_DB_USER: str
    AGENDAMENTOS_DB_PASSWORD: str

    RABBITMQ_HOST: str = "rabbitmq"
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str = "wonder_user"
    RABBITMQ_PASSWORD: str = ""
    RABBITMQ_QUEUE: str = "wonder.eventos"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.AGENDAMENTOS_DB_USER}:"
            f"{self.AGENDAMENTOS_DB_PASSWORD}@{self.AGENDAMENTOS_DB_HOST}:"
            f"{self.AGENDAMENTOS_DB_PORT}/{self.AGENDAMENTOS_DB_NAME}"
        )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()