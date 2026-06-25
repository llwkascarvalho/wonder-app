from sqlalchemy.orm import Session
from fastapi import HTTPException
from src.main.models.prestador_model import Avaliacao, HorarioFuncionamento, LogAuditoria, Prestador, Servico
from src.main.schemas.prestador_schema import AvaliacaoCreate, HorarioCreate, PrestadorCreate, PrestadorUpdate, ServicoCreate

# LEITURA

def listar_ativos(db: Session, nome: str = None, categoria_id: int = None):
    query = db.query(Prestador).filter(Prestador.status == "ativo")
    if nome:
        query = query.filter(Prestador.nome_estab.ilike(f"%{nome}%"))
    if categoria_id:
        query = query.join(Servico).filter(Servico.categoria_id == categoria_id)
    return query.order_by(Prestador.nome_estab).all()

def obter_por_id(db: Session, prestador_id: int):
    return db.query(Prestador).filter(Prestador.id == prestador_id).first()

def listar_servicos(db: Session, prestador_id: int):
    return db.query(Servico).filter(Servico.prestador_id == prestador_id).order_by(Servico.nome).all()

def listar_horarios(db: Session, prestador_id: int):
    return db.query(HorarioFuncionamento).filter(
        HorarioFuncionamento.prestador_id == prestador_id
    ).order_by(HorarioFuncionamento.dia_semana, HorarioFuncionamento.hora_inicio).all()

def listar_avaliacoes(db: Session, prestador_id: int):
    return db.query(Avaliacao).filter(Avaliacao.prestador_id == prestador_id).all()

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

def criar_horario(db: Session, prestador_id: int, dados: HorarioCreate, usuario_id: str) -> HorarioFuncionamento:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    horario = HorarioFuncionamento(
        prestador_id=prestador_id,
        dia_semana=dados.dia_semana,
        hora_inicio=dados.hora_inicio,
        hora_fim=dados.hora_fim
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario

def deletar_horario(db: Session, prestador_id: int, horario_id: int, usuario_id: str) -> dict:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    horario = db.query(HorarioFuncionamento).filter(
        HorarioFuncionamento.id == horario_id,
        HorarioFuncionamento.prestador_id == prestador_id
    ).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horário não encontrado.")

    db.delete(horario)
    db.commit()
    return {"mensagem": f"Horário id={horario_id} removido com sucesso."}

def criar_avaliacao(db: Session, prestador_id: int, dados: AvaliacaoCreate, usuario_id: str) -> Avaliacao:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissão para modificar este prestador.")

    avaliacao = Avaliacao(
        agendamento_id=dados.agendamento_id,
        prestador_id=prestador_id,
        nota=dados.nota
    )
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao

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
