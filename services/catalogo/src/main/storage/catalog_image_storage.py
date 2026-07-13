import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from src.main.core.config import settings

ALLOWED_SIGNATURES = {
    "image/jpeg": (".jpg", [b"\xff\xd8\xff"]),
    "image/png": (".png", [b"\x89PNG\r\n\x1a\n"]),
    "image/webp": (".webp", [b"RIFF"]),
}

ALLOWED_FOLDERS = {"categorias", "prestadores", "servicos"}


def ensure_catalog_upload_dir(folder: str | None = None) -> Path:
    base_dir = Path(settings.CATALOGO_UPLOAD_DIR)
    upload_dir = base_dir / folder if folder else base_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


async def save_catalog_image(file: UploadFile, folder: str, owner_id: int | str) -> str:
    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(status_code=400, detail="Destino de imagem invalido.")

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Arquivo de imagem nao enviado.")

    if len(content) > settings.CATALOGO_IMAGE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Imagem excede o tamanho maximo permitido.")

    extension = detect_extension(file.content_type, content)
    upload_dir = ensure_catalog_upload_dir(folder)
    filename = f"{owner_id}_{uuid4().hex}{extension}"
    file_path = upload_dir / filename

    file_path.write_bytes(content)
    return f"{settings.CATALOGO_UPLOAD_URL_PREFIX}/{folder}/{filename}"


def delete_catalog_image(foto_url: str | None) -> None:
    if not foto_url or not foto_url.startswith(f"{settings.CATALOGO_UPLOAD_URL_PREFIX}/"):
        return

    relative_path = foto_url.removeprefix(f"{settings.CATALOGO_UPLOAD_URL_PREFIX}/")
    parts = relative_path.split("/", 1)
    if len(parts) != 2 or parts[0] not in ALLOWED_FOLDERS:
        return

    filename = os.path.basename(parts[1])
    file_path = ensure_catalog_upload_dir(parts[0]) / filename

    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        return


def detect_extension(content_type: str | None, content: bytes) -> str:
    if content_type not in ALLOWED_SIGNATURES:
        raise HTTPException(status_code=400, detail="Formato de imagem nao permitido.")

    extension, signatures = ALLOWED_SIGNATURES[content_type]

    if content_type == "image/webp":
        is_valid = content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    else:
        is_valid = any(content.startswith(signature) for signature in signatures)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Conteudo da imagem nao corresponde ao formato informado.")

    return extension
