from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.main.models.prestador_model import (
    Avaliacao,
    Categoria,
    HorarioFuncionamento,
    LogAuditoria,
    Prestador,
    PrestadorCategoria,
    Servico,
)
from src.main.schemas.prestador_schema import (
    AvaliacaoCreate,
    CategoriaCreate,
    CategoriaStatusUpdate,
    CategoriaUpdate,
    HorarioCreate,
    PrestadorCategoriaCreate,
    PrestadorCreate,
    PrestadorStatusUpdate,
    PrestadorUpdate,
    ServicoCreate,
)

STATUS_VALIDOS = {"rascunho", "pendente", "ativo", "rejeitado", "suspenso"}
STATUS_EDICAO_PERMITIDA = {"rascunho", "rejeitado", "ativo", "suspenso"}
TRANSICOES_ADMIN = {
    "pendente": {"ativo", "rejeitado", "rascunho"},
    "ativo": {"suspenso"},
    "suspenso": {"ativo"},
    "rejeitado": {"rascunho"},
}


# LEITURA

def listar_ativos(db: Session, nome: str = None, categoria_id: int = None):
    query = db.query(Prestador).filter(Prestador.status == "ativo")
    if nome:
        query = query.filter(Prestador.nome_estab.ilike(f"%{nome}%"))
    if categoria_id:
        query = query.join(PrestadorCategoria).filter(PrestadorCategoria.categoria_id == categoria_id)
    return query.order_by(Prestador.nome_estab).all()


def listar_categorias_ativas(db: Session):
    return db.query(Categoria).filter(Categoria.status == "ativa").order_by(Categoria.nome).all()


def listar_todas_categorias(db: Session):
    return db.query(Categoria).order_by(Categoria.nome).all()


def obter_categoria(db: Session, categoria_id: int):
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def obter_categoria_por_nome(db: Session, nome: str):
    return db.query(Categoria).filter(func.lower(Categoria.nome) == nome.lower()).first()


def obter_servico(db: Session, prestador_id: int, servico_id: int):
    return (
        db.query(Servico)
        .filter(Servico.id == servico_id, Servico.prestador_id == prestador_id)
        .first()
    )


def listar_categorias_prestador(db: Session, prestador_id: int):
    return (
        db.query(PrestadorCategoria)
        .join(Categoria)
        .filter(PrestadorCategoria.prestador_id == prestador_id)
        .order_by(Categoria.nome)
        .all()
    )


def listar_pendentes(db: Session):
    return (
        db.query(Prestador)
        .filter(Prestador.status == "pendente")
        .order_by(Prestador.enviado_em.asc(), Prestador.id.asc())
        .all()
    )


def obter_por_id(db: Session, prestador_id: int):
    return db.query(Prestador).filter(Prestador.id == prestador_id).first()


def obter_por_usuario(db: Session, usuario_id: str):
    return db.query(Prestador).filter(Prestador.usuario_id == str(usuario_id)).first()


def listar_servicos(db: Session, prestador_id: int):
    return db.query(Servico).filter(Servico.prestador_id == prestador_id).order_by(Servico.nome).all()


def listar_horarios(db: Session, prestador_id: int):
    return (
        db.query(HorarioFuncionamento)
        .filter(HorarioFuncionamento.prestador_id == prestador_id)
        .order_by(HorarioFuncionamento.dia_semana, HorarioFuncionamento.hora_inicio)
        .all()
    )


def listar_avaliacoes(db: Session, prestador_id: int):
    return db.query(Avaliacao).filter(Avaliacao.prestador_id == prestador_id).all()


def registrar_auditoria(db: Session, usuario_id: str, tabela: str, descricao: str):
    log = LogAuditoria(
        usuario_id=usuario_id,
        operacao="SELECT",
        tabela_afetada=tabela,
        dados_novos={"descricao": descricao},
    )
    db.add(log)
    db.commit()


def validar_requisitos_envio(db: Session, prestador: Prestador) -> list[str]:
    erros = []

    if not prestador.nome_estab or not prestador.documento:
        erros.append("Perfil obrigatorio incompleto.")

    servicos = listar_servicos(db, prestador.id)
    if not servicos:
        erros.append("Cadastre ao menos um servico.")

    if not listar_categorias_prestador(db, prestador.id):
        erros.append("Associe ao menos uma categoria ao estabelecimento.")

    if not listar_horarios(db, prestador.id):
        erros.append("Cadastre ao menos um horario.")

    return erros


def exigir_dono_editavel(prestador: Prestador, usuario_id: str):
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissao para modificar este prestador.")
    if prestador.status not in STATUS_EDICAO_PERMITIDA:
        raise HTTPException(status_code=409, detail="Cadastro nao pode ser editado neste status.")


# ESCRITA

def criar_prestador(db: Session, dados: PrestadorCreate, usuario_id: str) -> Prestador:
    if obter_por_usuario(db, usuario_id):
        raise HTTPException(status_code=409, detail="Usuario ja possui cadastro de prestador.")

    prestador = Prestador(
        usuario_id=str(usuario_id),
        nome_estab=dados.nome_estab,
        documento=dados.documento,
        status="rascunho",
    )
    db.add(prestador)
    db.commit()
    db.refresh(prestador)
    return prestador


def criar_categoria(db: Session, dados: CategoriaCreate) -> Categoria:
    if obter_categoria_por_nome(db, dados.nome):
        raise HTTPException(status_code=409, detail="Categoria ja cadastrada.")

    categoria = Categoria(nome=dados.nome, descricao=dados.descricao, status="ativa")
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


def atualizar_categoria(db: Session, categoria_id: int, dados: CategoriaUpdate) -> Categoria:
    categoria = obter_categoria(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada.")

    if dados.nome is not None:
        existente = obter_categoria_por_nome(db, dados.nome)
        if existente and existente.id != categoria.id:
            raise HTTPException(status_code=409, detail="Categoria ja cadastrada.")
        categoria.nome = dados.nome
    if dados.descricao is not None:
        categoria.descricao = dados.descricao

    db.commit()
    db.refresh(categoria)
    return categoria


def atualizar_status_categoria(db: Session, categoria_id: int, dados: CategoriaStatusUpdate) -> Categoria:
    if dados.status not in {"ativa", "inativa"}:
        raise HTTPException(status_code=400, detail="Status invalido.")

    categoria = obter_categoria(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada.")

    categoria.status = dados.status
    db.commit()
    db.refresh(categoria)
    return categoria


def atualizar_foto_categoria(db: Session, categoria_id: int, foto_url: str) -> tuple[Categoria, str | None]:
    categoria = obter_categoria(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada.")

    foto_antiga = categoria.foto
    categoria.foto = foto_url
    db.commit()
    db.refresh(categoria)
    return categoria, foto_antiga


def associar_categorias(
    db: Session, prestador_id: int, dados: PrestadorCategoriaCreate, usuario_id: str
) -> list[PrestadorCategoria]:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    categoria_ids = list(dict.fromkeys(dados.categoria_ids))
    if not categoria_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos uma categoria.")

    categorias = (
        db.query(Categoria)
        .filter(Categoria.id.in_(categoria_ids), Categoria.status == "ativa")
        .all()
    )
    categorias_encontradas = {categoria.id for categoria in categorias}
    if categorias_encontradas != set(categoria_ids):
        raise HTTPException(status_code=400, detail="Uma ou mais categorias sao invalidas ou inativas.")

    existentes = {
        vinculo.categoria_id
        for vinculo in db.query(PrestadorCategoria)
        .filter(
            PrestadorCategoria.prestador_id == prestador_id,
            PrestadorCategoria.categoria_id.in_(categoria_ids),
        )
        .all()
    }
    if existentes:
        raise HTTPException(status_code=409, detail="Vinculo de categoria duplicado.")

    vinculos = [
        PrestadorCategoria(prestador_id=prestador_id, categoria_id=categoria_id)
        for categoria_id in categoria_ids
    ]
    db.add_all(vinculos)
    db.commit()
    for vinculo in vinculos:
        db.refresh(vinculo)
    return vinculos


def remover_categoria_prestador(db: Session, prestador_id: int, categoria_id: int, usuario_id: str) -> dict:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    vinculo = (
        db.query(PrestadorCategoria)
        .filter(
            PrestadorCategoria.prestador_id == prestador_id,
            PrestadorCategoria.categoria_id == categoria_id,
        )
        .first()
    )
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vinculo de categoria nao encontrado.")

    db.delete(vinculo)
    db.commit()
    return {"mensagem": "Categoria removida do prestador com sucesso."}


def criar_servico(db: Session, prestador_id: int, dados: ServicoCreate, usuario_id: str) -> Servico:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    if dados.categoria_id is not None:
        categoria = db.query(Categoria).filter(Categoria.id == dados.categoria_id).first()
        if not categoria:
            raise HTTPException(status_code=400, detail="Categoria invalida.")

    servico = Servico(
        prestador_id=prestador_id,
        nome=dados.nome,
        preco=dados.preco,
        duracao_min=dados.duracao_min,
        categoria_id=dados.categoria_id,
    )
    db.add(servico)
    db.commit()
    db.refresh(servico)
    return servico


def atualizar_foto_prestador(db: Session, prestador_id: int, foto_url: str, usuario_id: str) -> tuple[Prestador, str | None]:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    foto_antiga = prestador.foto
    prestador.foto = foto_url
    db.commit()
    db.refresh(prestador)
    return prestador, foto_antiga


def atualizar_foto_servico(
    db: Session,
    prestador_id: int,
    servico_id: int,
    foto_url: str,
    usuario_id: str,
) -> tuple[Servico, str | None]:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    servico = obter_servico(db, prestador_id, servico_id)
    if not servico:
        raise HTTPException(status_code=404, detail="Servico nao encontrado.")

    foto_antiga = servico.foto
    servico.foto = foto_url
    db.commit()
    db.refresh(servico)
    return servico, foto_antiga


def criar_horario(db: Session, prestador_id: int, dados: HorarioCreate, usuario_id: str) -> HorarioFuncionamento:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    horario = HorarioFuncionamento(
        prestador_id=prestador_id,
        dia_semana=dados.dia_semana,
        hora_inicio=dados.hora_inicio,
        hora_fim=dados.hora_fim,
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario


def deletar_horario(db: Session, prestador_id: int, horario_id: int, usuario_id: str) -> dict:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    horario = (
        db.query(HorarioFuncionamento)
        .filter(
            HorarioFuncionamento.id == horario_id,
            HorarioFuncionamento.prestador_id == prestador_id,
        )
        .first()
    )
    if not horario:
        raise HTTPException(status_code=404, detail="Horario nao encontrado.")

    db.delete(horario)
    db.commit()
    return {"mensagem": f"Horario id={horario_id} removido com sucesso."}


def criar_avaliacao(db: Session, prestador_id: int, dados: AvaliacaoCreate, usuario_id: str) -> Avaliacao:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissao para modificar este prestador.")

    avaliacao = Avaliacao(
        agendamento_id=dados.agendamento_id,
        prestador_id=prestador_id,
        nota=dados.nota,
    )
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao


def atualizar_prestador(db: Session, prestador_id: int, dados: PrestadorUpdate, usuario_id: str) -> Prestador:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    exigir_dono_editavel(prestador, usuario_id)

    if dados.nome_estab is not None:
        prestador.nome_estab = dados.nome_estab
    if dados.documento is not None:
        prestador.documento = dados.documento

    db.commit()
    db.refresh(prestador)
    return prestador


def enviar_para_aprovacao(db: Session, prestador_id: int, usuario_id: str) -> Prestador:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissao para enviar este cadastro.")
    if prestador.status not in {"rascunho", "rejeitado"}:
        raise HTTPException(status_code=409, detail="Cadastro nao pode ser enviado neste status.")

    erros = validar_requisitos_envio(db, prestador)
    if erros:
        raise HTTPException(status_code=400, detail={"erros": erros})

    prestador.status = "pendente"
    prestador.enviado_em = datetime.utcnow()
    prestador.motivo_rejeicao = None
    db.commit()
    db.refresh(prestador)
    return prestador


def atualizar_status_admin(
    db: Session, prestador_id: int, dados: PrestadorStatusUpdate, admin_id: str
) -> Prestador:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    if str(prestador.usuario_id) == str(admin_id):
        raise HTTPException(status_code=403, detail="Usuario nao pode aprovar o proprio cadastro.")
    if dados.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status invalido.")
    if dados.status not in TRANSICOES_ADMIN.get(prestador.status, set()):
        raise HTTPException(
            status_code=409,
            detail=f"Transicao invalida: {prestador.status} -> {dados.status}.",
        )
    if dados.status in {"rejeitado", "rascunho"} and not dados.motivo_rejeicao:
        raise HTTPException(status_code=400, detail="Informe o motivo ou observacao.")

    prestador.status = dados.status
    if dados.status == "ativo":
        prestador.aprovado_em = datetime.utcnow()
        prestador.aprovado_por = str(admin_id)
        prestador.motivo_rejeicao = None
    elif dados.status in {"rejeitado", "rascunho"}:
        prestador.motivo_rejeicao = dados.motivo_rejeicao
        prestador.aprovado_em = None
        prestador.aprovado_por = None
    elif dados.status == "suspenso":
        prestador.motivo_rejeicao = dados.motivo_rejeicao

    db.commit()
    db.refresh(prestador)
    return prestador


def remover_prestador(db: Session, prestador_id: int, usuario_id: str) -> dict:
    prestador = obter_por_id(db, prestador_id)
    if not prestador:
        raise HTTPException(status_code=404, detail="Prestador nao encontrado.")
    if str(prestador.usuario_id) != str(usuario_id):
        raise HTTPException(status_code=403, detail="Sem permissao para modificar este prestador.")

    prestador.status = "suspenso" if prestador.status == "ativo" else "rascunho"
    db.commit()
    return {"mensagem": f"Prestador id={prestador_id} inativado com sucesso."}
