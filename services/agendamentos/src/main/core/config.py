from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    AGENDAMENTOS_DB_HOST: str
    AGENDAMENTOS_DB_PORT: str
    AGENDAMENTOS_DB_NAME: str
    AGENDAMENTOS_DB_USER: str
    AGENDAMENTOS_DB_PASSWORD: str

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.AGENDAMENTOS_DB_USER}:{self.AGENDAMENTOS_DB_PASSWORD}@{self.AGENDAMENTOS_DB_HOST}:{self.AGENDAMENTOS_DB_PORT}/{self.AGENDAMENTOS_DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()