from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from src.main.dependencies.auth import exigir_admin
from src.main.repositories import monitoramento_repo
from src.main.schemas.monitoramento_schema import MonitoramentoBancoResponse

router = APIRouter(tags=["Admin"], dependencies=[Depends(exigir_admin)])

BANCOS_VALIDOS = ["auth", "catalogo", "agendamentos", "notificacoes"]


@router.get("/monitoramento", response_model=list[MonitoramentoBancoResponse])
def obter_monitoramento(
    banco: Optional[str] = Query(None, description="auth | catalogo | agendamentos | notificacoes"),
    limit: int = Query(10, ge=1, le=50),
):
    if banco and banco not in BANCOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Banco invalido. Use um de: {', '.join(BANCOS_VALIDOS)}",
        )

    return monitoramento_repo.coletar_monitoramento(banco=banco, limit=limit)
