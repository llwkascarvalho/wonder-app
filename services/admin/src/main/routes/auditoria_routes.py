from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from src.main.dependencies.auth import exigir_admin
from src.main.repositories import auditoria_repo
from src.main.schemas.auditoria_schema import LogAuditoriaResponse, ResumoAuditoriaItem

router = APIRouter(tags=["Admin"], dependencies=[Depends(exigir_admin)])

BANCOS_VALIDOS = ["auth", "catalogo", "agendamentos", "notificacoes"]
OPERACOES_VALIDAS = ["INSERT", "UPDATE", "DELETE", "SELECT"]


@router.get("/auditoria", response_model=List[LogAuditoriaResponse])
def listar_auditoria(
    banco: Optional[str] = Query(None, description="auth | catalogo | agendamentos | notificacoes"),
    operacao: Optional[str] = Query(None, description="INSERT | UPDATE | DELETE | SELECT"),
    tabela: Optional[str] = Query(None, description="Nome da tabela afetada"),
    limit: int = Query(50, ge=1, le=500),
):
    if banco and banco not in BANCOS_VALIDOS:
        raise HTTPException(
            status_code=400, detail=f"Banco inválido. Use um de: {', '.join(BANCOS_VALIDOS)}"
        )
    if operacao and operacao.upper() not in OPERACOES_VALIDAS:
        raise HTTPException(
            status_code=400, detail=f"Operação inválida. Use uma de: {', '.join(OPERACOES_VALIDAS)}"
        )

    return auditoria_repo.buscar_logs(
        banco=banco,
        operacao=operacao.upper() if operacao else None,
        tabela=tabela,
        limit=limit,
    )


@router.get("/auditoria/resumo", response_model=List[ResumoAuditoriaItem])
def resumo_auditoria():
    return auditoria_repo.resumo_auditoria()
