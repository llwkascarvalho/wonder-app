from fastapi import HTTPException, Request


def exigir_admin(request: Request) -> None:
    """Bloqueia o acesso caso o header X-User-Role (injetado pelo Gateway
    a partir do JWT) não seja 'admin'."""
    if request.headers.get("X-User-Role", "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
