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


def ensure_profile_upload_dir() -> Path:
    upload_dir = Path(settings.PROFILE_UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


async def save_profile_photo(file: UploadFile, user_id: int | str) -> str:
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Arquivo de imagem nao enviado.")

    if len(content) > settings.PROFILE_PHOTO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Imagem excede o tamanho maximo permitido.")

    extension = detect_extension(file.content_type, content)
    upload_dir = ensure_profile_upload_dir()
    filename = f"{user_id}_{uuid4().hex}{extension}"
    file_path = upload_dir / filename

    file_path.write_bytes(content)
    return f"{settings.PROFILE_UPLOAD_URL_PREFIX}/{filename}"


def delete_profile_photo(foto_url: str | None) -> None:
    if not foto_url or not foto_url.startswith(settings.PROFILE_UPLOAD_URL_PREFIX):
        return

    filename = os.path.basename(foto_url)
    file_path = ensure_profile_upload_dir() / filename

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
