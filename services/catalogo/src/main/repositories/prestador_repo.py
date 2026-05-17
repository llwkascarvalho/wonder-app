from sqlalchemy.orm import Session
from fastapi import HTTPException
from src.main.models.prestador_model import Prestador, Servico, LogAuditoria
from src.main.schemas.prestador_schema import PrestadorCreate, PrestadorUpdate, ServicoCreate

# LEITURA

def listar_ativos(db: Session):
    return db.query(Prestador).filter(Prestador.status == "ativo").order_by(Prestador.nome_estab).all()

def obter_por_id(db: Session, prestador_id: int):
    return db.query(Prestador).filter(Prestador.id == prestador_id).first()

def listar_servicos(db: Session, prestador_id: int):
    return db.query(Servico).filter(Servico.prestador_id == prestador_id).order_by(Servico.nome).all()

def registrar_auditoria(db: Session, usuario_id: str, tabela: str, descricao: str):
    log = LogAuditoria(
        usuario_id=usuario_id,
        operacao="SELECT",
        tabela_afetada=tabela,
        dados_novos={"descricao": descricao}
    )
    db.add(log)
    db.commit()

# ESCRITA

def criar_prestador(db: Session, dados: PrestadorCreate, usuario_id: str) -> Prestador:
    prestador = Prestador(
        usuario_id=usuario_id,
        nome_estab=dados.nome_estab,
        documento=dados.documento,
        status="ativo"
    )
    db.add(prestador)
    db.commit()
    db.refresh(prestador)
    return prestador

def criar_servico(db: Session, prestador_id: int, dados: ServicoCreate, usuario_id: str) -> Servico:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    servico = Servico(
        prestador_id=prestador_id,
        nome=dados.nome,
        preco=dados.preco,
        duracao_min=dados.duracao_min,
        categoria_id=dados.categoria_id
    )
    db.add(servico)
    db.commit()
    db.refresh(servico)
    return servico

def atualizar_prestador(db: Session, prestador_id: int, dados: PrestadorUpdate, usuario_id: str) -> Prestador:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    if dados.nome_estab is not None:
        prestador.nome_estab = dados.nome_estab
    if dados.documento is not None:
        prestador.documento = dados.documento
    if dados.status is not None:
        prestador.status = dados.status

    db.commit()
    db.refresh(prestador)
    return prestador

def remover_prestador(db: Session, prestador_id: int, usuario_id: str) -> dict:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    prestador.status = "inativo"
    db.commit()
    return {"mensagem": f"Prestador id={prestador_id} inativado com sucesso."}