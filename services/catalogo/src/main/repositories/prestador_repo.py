from sqlalchemy.orm import Session
from src.main.models.prestador_model import Prestador, Servico, LogAuditoria

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