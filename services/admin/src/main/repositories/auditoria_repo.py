from typing import List, Optional
from sqlalchemy import text
from src.main.core.database import engines

BANCOS_VALIDOS = list(engines.keys())  # auth, catalogo, agendamentos, notificacoes


def _query_banco(nome_banco: str, operacao: Optional[str], tabela: Optional[str], limit: int) -> List[dict]:
    engine = engines[nome_banco]

    sql = (
        "SELECT id, usuario_id, operacao, tabela_afetada, dados_antigos, dados_novos, data_hora "
        "FROM logs_auditoria WHERE 1=1"
    )
    params: dict = {}

    if operacao:
        sql += " AND operacao = :operacao"
        params["operacao"] = operacao
    if tabela:
        sql += " AND tabela_afetada = :tabela"
        params["tabela"] = tabela

    sql += " ORDER BY data_hora DESC LIMIT :limit"
    params["limit"] = limit

    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()

    resultado = []
    for row in rows:
        item = dict(row)
        item["id"] = str(item["id"])
        item["banco"] = nome_banco
        resultado.append(item)
    return resultado


def buscar_logs(
    banco: Optional[str], operacao: Optional[str], tabela: Optional[str], limit: int
) -> List[dict]:
    bancos = [banco] if banco else BANCOS_VALIDOS

    resultados: List[dict] = []
    for nome_banco in bancos:
        resultados.extend(_query_banco(nome_banco, operacao, tabela, limit))

    # Ao consultar múltiplos bancos, cada um já vem ordenado e limitado
    # individualmente — aqui reordenamos o conjunto agregado e aplicamos
    # o limite final, do mais recente para o mais antigo.
    resultados.sort(key=lambda item: item["data_hora"], reverse=True)
    return resultados[:limit]


def resumo_auditoria() -> List[dict]:
    sql = "SELECT operacao, COUNT(*) AS total FROM logs_auditoria GROUP BY operacao ORDER BY operacao"

    resultados: List[dict] = []
    for nome_banco, engine in engines.items():
        with engine.connect() as conn:
            rows = conn.execute(text(sql)).mappings().all()
        for row in rows:
            resultados.append({"banco": nome_banco, "operacao": row["operacao"], "total": row["total"]})
    return resultados
