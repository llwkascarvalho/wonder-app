from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from src.main.core.config import settings
from src.main.dependencies.auth import exigir_admin
from src.main.schemas.prestador_schema import (
    CategoriaCreate,
    CategoriaResponse,
    CategoriaStatusUpdate,
    CategoriaUpdate,
    PrestadorDetalheResponse,
    PrestadorResponse,
    PrestadorStatusUpdate,
)

router = APIRouter(tags=["Admin"], dependencies=[Depends(exigir_admin)])

STATUS_VALIDOS = {"rascunho", "pendente", "ativo", "rejeitado", "suspenso"}


def admin_headers(request: Request) -> dict[str, str]:
    return {
        "X-User-ID": request.headers.get("X-User-ID", "desconhecido"),
        "X-User-Role": request.headers.get("X-User-Role", ""),
        "X-Internal-Service": "admin",
    }


def payload_erro(response: httpx.Response):
    try:
        return response.json()
    except ValueError:
        return {"detail": response.text}


async def chamar_json(method: str, url: str, headers: dict[str, str], json: dict | None = None):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.request(method, url, headers=headers, json=json)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Servico indisponivel: {exc}")

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=payload_erro(response))

    return response.json()


async def obter_detalhe_catalogo(prestador_id: int, headers: dict[str, str]) -> dict:
    return await chamar_json(
        "GET",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/prestadores/{prestador_id}",
        headers,
    )


async def atualizar_status_catalogo(
    prestador_id: int, dados: PrestadorStatusUpdate, headers: dict[str, str]
) -> dict:
    return await chamar_json(
        "PATCH",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/prestadores/{prestador_id}/status",
        headers,
        json=dados.model_dump(),
    )


async def promover_usuario_auth(usuario_id: int | str, headers: dict[str, str]) -> dict:
    return await chamar_json(
        "PATCH",
        f"{settings.AUTH_SERVICE_URL}/auth/internal/usuarios/{usuario_id}/tipo",
        headers,
        json={"tipo_usuario": "prestador"},
    )


@router.get("/prestadores/pendentes", response_model=List[PrestadorResponse])
async def listar_pendentes(request: Request):
    return await chamar_json(
        "GET",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/prestadores/pendentes",
        admin_headers(request),
    )


@router.get("/prestadores/{prestador_id}", response_model=PrestadorDetalheResponse)
async def obter_detalhe(prestador_id: int, request: Request):
    return await obter_detalhe_catalogo(prestador_id, admin_headers(request))


@router.patch("/prestadores/{prestador_id}/status", response_model=PrestadorResponse)
async def atualizar_status(prestador_id: int, dados: PrestadorStatusUpdate, request: Request):
    if dados.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status invalido.")

    headers = admin_headers(request)
    detalhe = await obter_detalhe_catalogo(prestador_id, headers)

    if dados.status == "ativo":
        if str(detalhe.get("usuario_id")) == str(headers["X-User-ID"]):
            raise HTTPException(status_code=403, detail="Usuario nao pode aprovar o proprio cadastro.")

        await promover_usuario_auth(detalhe["usuario_id"], headers)

    return await atualizar_status_catalogo(prestador_id, dados, headers)


@router.get("/categorias", response_model=List[CategoriaResponse])
async def listar_categorias(request: Request):
    return await chamar_json(
        "GET",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/categorias",
        admin_headers(request),
    )


@router.post("/categorias", response_model=CategoriaResponse, status_code=201)
async def criar_categoria(dados: CategoriaCreate, request: Request):
    return await chamar_json(
        "POST",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/categorias",
        admin_headers(request),
        json=dados.model_dump(),
    )


@router.put("/categorias/{categoria_id}", response_model=CategoriaResponse)
async def atualizar_categoria(categoria_id: int, dados: CategoriaUpdate, request: Request):
    return await chamar_json(
        "PUT",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/categorias/{categoria_id}",
        admin_headers(request),
        json=dados.model_dump(),
    )


@router.patch("/categorias/{categoria_id}/status", response_model=CategoriaResponse)
async def atualizar_status_categoria(categoria_id: int, dados: CategoriaStatusUpdate, request: Request):
    return await chamar_json(
        "PATCH",
        f"{settings.CATALOGO_SERVICE_URL}/catalogo/admin/categorias/{categoria_id}/status",
        admin_headers(request),
        json=dados.model_dump(),
    )
