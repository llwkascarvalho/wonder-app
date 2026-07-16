from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.main.core.config import settings
from src.main.routes import prestador_routes
from src.main.storage.catalog_image_storage import ensure_catalog_upload_dir

app = FastAPI(
    title="Wonder - Serviço Catálogo",
    description="Responsável pelo gerenciamento de prestadores e serviços.",
    version="1.0.0"
)

app.include_router(prestador_routes.router, prefix="/catalogo")
ensure_catalog_upload_dir()
app.mount("/catalogo/uploads", StaticFiles(directory=settings.CATALOGO_UPLOAD_DIR), name="catalogo_uploads")

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "catalogo"}
