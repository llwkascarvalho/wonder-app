from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.main.core.config import settings
from src.main.routes import auth_routes
from src.main.storage.profile_storage import ensure_profile_upload_dir

app = FastAPI(
    title="Wonder - Serviço de Autenticação",
    description="Login via Google OAuth2 e geração de JWT.",
    version="1.0.0"
)

app.include_router(auth_routes.router)
ensure_profile_upload_dir()
app.mount("/auth/uploads/profile", StaticFiles(directory=settings.PROFILE_UPLOAD_DIR), name="profile_uploads")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "auth"}
