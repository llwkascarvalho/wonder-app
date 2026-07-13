from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Banco de Dados
    AUTH_DB_HOST: str
    AUTH_DB_PORT: str
    AUTH_DB_NAME: str
    AUTH_DB_USER: str
    AUTH_DB_PASSWORD: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # Google OAuth2
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # Upload de perfil
    PROFILE_UPLOAD_DIR: str = "uploads/profile"
    PROFILE_UPLOAD_URL_PREFIX: str = "/auth/uploads/profile"
    PROFILE_PHOTO_MAX_BYTES: int = 5 * 1024 * 1024

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.AUTH_DB_USER}:{self.AUTH_DB_PASSWORD}@{self.AUTH_DB_HOST}:{self.AUTH_DB_PORT}/{self.AUTH_DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
