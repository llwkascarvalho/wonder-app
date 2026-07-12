from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.main.dependencies.db import get_db
from src.main.models.prestador_model import Categoria
from src.main.repositories import prestador_repo
from src.main.schemas.prestador_schema import (
    AvaliacaoCreate,
    AvaliacaoResponse,
    CategoriaResponse,
    HorarioCreate,
    HorarioResponse,
    PrestadorCreate,
    PrestadorDetalheResponse,
    PrestadorResponse,
    PrestadorStatusUpdate,
    PrestadorUpdate,
    ServicoCreate,
    ServicoResponse,
)

router = APIRouter(tags=["Catalogo"])


def get_user_id(request: Request) -> str:
    return request.headers.get("X-User-ID", "desconhecido")


def is_admin(request: Request) -> bool:
    return request.headers.get("X-User-Role", "").lower() == "admin"


def exigir_admin(request: Request):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")


# LEITURA PUBLICA/AUTENTICADA

@router.get("/prestadores", response_model=List[PrestadorResponse])
def listar_prestadores(
    request: Request,
    nome: str = None,
    categoria_id: int = None,
    db: Session = Depends(get_db),
):
    prestadores = prestador_repo.listar_ativos(db, nome=nome, categoria_id=categoria_id)

    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "prestador", f"Admin listou {len(prestadores)} prestadores"
        )

    return prestadores


@router.get("/categorias", response_model=List[CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()


@router.get("/prestadores/me", response_model=PrestadorResponse)
def obter_meu_prestador(request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_usuario(db, get_user_id(request))
    if not prestador:
        raise HTTPException(status_code=404, detail="Cadastro de prestador nao encontrado.")
    return prestador


@router.get("/prestadores/{prestador_id}", response_model=PrestadorResponse)
def obter_prestador(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador or (not is_admin(request) and prestador.status != "ativo"):
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")

    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "prestador", f"Admin consultou prestador id={prestador_id}"
        )

    return prestador


@router.get("/prestadores/{prestador_id}/servicos", response_model=List[ServicoResponse])
def listar_servicos_prestador(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador or (not is_admin(request) and prestador.status != "ativo"):
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")

    servicos = prestador_repo.listar_servicos(db, prestador_id)

    if is_admin(request):
        prestador_repo.registrar_auditoria(
            db, get_user_id(request), "servico", f"Admin listou {len(servicos)} servicos do id={prestador_id}"
        )

    return servicos


@router.get("/prestadores/{prestador_id}/horarios", response_model=List[HorarioResponse])
def listar_horarios(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador or (not is_admin(request) and prestador.status != "ativo"):
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    return prestador_repo.listar_horarios(db, prestador_id)


@router.get("/prestadores/{prestador_id}/avaliacoes", response_model=List[AvaliacaoResponse])
def listar_avaliacoes(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador or (not is_admin(request) and prestador.status != "ativo"):
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    return prestador_repo.listar_avaliacoes(db, prestador_id)


# ESCRITA DO PROPRIO PRESTADOR

@router.post("/prestadores", response_model=PrestadorResponse, status_code=201)
def criar_prestador(dados: PrestadorCreate, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.criar_prestador(db, dados, get_user_id(request))


@router.put("/prestadores/{prestador_id}", response_model=PrestadorResponse)
def atualizar_prestador(prestador_id: int, dados: PrestadorUpdate, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.atualizar_prestador(db, prestador_id, dados, get_user_id(request))


@router.post("/prestadores/{prestador_id}/enviar-aprovacao", response_model=PrestadorResponse)
def enviar_para_aprovacao(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.enviar_para_aprovacao(db, prestador_id, get_user_id(request))


@router.post("/prestadores/{prestador_id}/servicos", response_model=ServicoResponse, status_code=201)
def criar_servico(prestador_id: int, dados: ServicoCreate, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.criar_servico(db, prestador_id, dados, get_user_id(request))


@router.post("/prestadores/{prestador_id}/horarios", response_model=HorarioResponse, status_code=201)
def criar_horario(prestador_id: int, dados: HorarioCreate, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.criar_horario(db, prestador_id, dados, get_user_id(request))


@router.post("/prestadores/{prestador_id}/avaliacoes", response_model=AvaliacaoResponse, status_code=201)
def criar_avaliacao(prestador_id: int, dados: AvaliacaoCreate, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.criar_avaliacao(db, prestador_id, dados, get_user_id(request))


@router.delete("/prestadores/{prestador_id}")
def remover_prestador(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.remover_prestador(db, prestador_id, get_user_id(request))


@router.delete("/prestadores/{prestador_id}/horarios/{horario_id}")
def deletar_horario(prestador_id: int, horario_id: int, request: Request, db: Session = Depends(get_db)):
    return prestador_repo.deletar_horario(db, prestador_id, horario_id, get_user_id(request))


# ENDPOINTS ADMINISTRATIVOS USADOS PELO SERVICO ADMIN

@router.get("/admin/prestadores/pendentes", response_model=List[PrestadorResponse])
def admin_listar_pendentes(request: Request, db: Session = Depends(get_db)):
    exigir_admin(request)
    prestadores = prestador_repo.listar_pendentes(db)
    prestador_repo.registrar_auditoria(
        db, get_user_id(request), "prestador", f"Admin listou {len(prestadores)} prestadores pendentes"
    )
    return prestadores


@router.get("/admin/prestadores/{prestador_id}", response_model=PrestadorDetalheResponse)
def admin_obter_detalhe(prestador_id: int, request: Request, db: Session = Depends(get_db)):
    exigir_admin(request)
    prestador = prestador_repo.obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    prestador_repo.registrar_auditoria(
        db, get_user_id(request), "prestador", f"Admin consultou detalhe do prestador id={prestador_id}"
    )
    return prestador


@router.patch("/admin/prestadores/{prestador_id}/status", response_model=PrestadorResponse)
def admin_atualizar_status(
    prestador_id: int,
    dados: PrestadorStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    exigir_admin(request)
    return prestador_repo.atualizar_status_admin(db, prestador_id, dados, get_user_id(request))
