from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from src.main.dependencies.db import get_db
from src.main.repositories import prestador_repo
from src.main.schemas.prestador_schema import PrestadorResponse, ServicoResponse

router = APIRouter(tags=["Catálogo"])

def get_user_id(request: Request) -> str:
    return request.headers.get("X-User-ID", "desconhecido")

def is_admin(request: Request) -> bool:
    return request.headers.get("X-User-Role", "").lower() == "admin"

@router.get("/prestadores", response_model=List[PrestadorResponse])
def listar_prestadores(request: Request, db: Session = Depends(get_db)):
    prestadores = prestador_repo.listar_ativos(db)
    
    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "prestador", f"Admin listou {len(prestadores)} prestadores"
        )
        
    return prestadores

@router.get("/prestadores/{prestador_id}", response_model=PrestadorResponse)
def obter_prestador(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
        
    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "prestador", f"Admin consultou prestador id={prestador_id}"
        )
        
    return prestador

@router.get("/prestadores/{prestador_id}/servicos", response_model=List[ServicoResponse])
def listar_servicos_prestador(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
        
    servicos = prestador_repo.listar_servicos(db, prestador_id)
    
    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "servico", f"Admin listou {len(servicos)} servicos do id={prestador_id}"
        )
        
    return servicos