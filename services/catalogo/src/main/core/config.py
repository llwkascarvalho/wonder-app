from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    CATALOGO_DB_HOST: str
    CATALOGO_DB_PORT: str
    CATALOGO_DB_NAME: str
    CATALOGO_DB_USER: str
    CATALOGO_DB_PASSWORD: str

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.CATALOGO_DB_USER}:{self.CATALOGO_DB_PASSWORD}@{self.CATALOGO_DB_HOST}:{self.CATALOGO_DB_PORT}/{self.CATALOGO_DB_NAME}"

    class Config:
        env_file = ".env"

settings = Settings()