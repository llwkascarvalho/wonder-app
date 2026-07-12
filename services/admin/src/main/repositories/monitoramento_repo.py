from typing import Optional

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.main.core.database import engines

BANCOS_VALIDOS = list(engines.keys())

QUERY_LENTAS_SQL = text(
    """
    SELECT
        LEFT(query, 500) AS query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows
    FROM pg_stat_statements
    WHERE query NOT ILIKE 'CREATE EXTENSION%'
      AND query NOT ILIKE 'CREATE FUNCTION%'
      AND query NOT ILIKE 'CREATE VIEW%'
      AND query NOT ILIKE 'CREATE OR REPLACE FUNCTION%'
      AND query NOT ILIKE 'CREATE OR REPLACE VIEW%'
      AND query NOT ILIKE 'DROP VIEW%'
      AND query NOT ILIKE 'DROP FUNCTION%'
      AND query NOT ILIKE 'COMMENT ON%'
      AND query NOT ILIKE 'ALTER EXTENSION%'
      AND query NOT ILIKE '%pg_stat_statements%'
      AND query NOT ILIKE '%pg_stat_activity%'
      AND query NOT ILIKE '%pg_stat_user_tables%'
      AND query NOT ILIKE '%pg_type%'
      AND query NOT ILIKE '%pg_namespace%'
      AND query NOT ILIKE '%pg_extension%'
      AND query NOT ILIKE '%pg_catalog.version%'
      AND query NOT ILIKE 'select current_schema%'
      AND query NOT ILIKE 'show transaction isolation level%'
      AND query NOT ILIKE 'show standard_conforming_strings%'
      AND query NOT ILIKE 'show shared_preload_libraries%'
      AND query NOT ILIKE 'begin%'
      AND query NOT ILIKE 'commit%'
      AND query NOT ILIKE 'rollback%'
      AND query NOT ILIKE 'select $%'
    ORDER BY mean_exec_time DESC
    LIMIT :limit
    """
)

CONEXOES_ATIVAS_SQL = text(
    """
    SELECT
        pid,
        usename AS usuario,
        application_name AS aplicacao,
        client_addr::text AS cliente,
        state AS estado,
        wait_event_type,
        EXTRACT(EPOCH FROM (now() - query_start)) AS duracao_segundos,
        LEFT(query, 500) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active'
      AND pid <> pg_backend_pid()
    ORDER BY query_start NULLS LAST
    LIMIT :limit
    """
)

DEAD_TUPLES_SQL = text(
    """
    SELECT
        schemaname AS schema_name,
        relname AS tabela,
        n_live_tup AS live_tuples,
        n_dead_tup AS dead_tuples,
        last_vacuum,
        last_autovacuum
    FROM pg_stat_user_tables
    ORDER BY n_dead_tup DESC, relname
    LIMIT :limit
    """
)


def _normalizar_linhas(rows) -> list[dict]:
    return [dict(row) for row in rows]


def coletar_banco(nome_banco: str, limit: int) -> dict:
    engine = engines[nome_banco]

    try:
        with engine.connect() as conn:
            queries_lentas = _normalizar_linhas(
                conn.execute(QUERY_LENTAS_SQL, {"limit": limit}).mappings().all()
            )
            conexoes_ativas = _normalizar_linhas(
                conn.execute(CONEXOES_ATIVAS_SQL, {"limit": limit}).mappings().all()
            )
            tabelas_dead_tuples = _normalizar_linhas(
                conn.execute(DEAD_TUPLES_SQL, {"limit": limit}).mappings().all()
            )
    except SQLAlchemyError as exc:
        return {
            "banco": nome_banco,
            "queries_lentas": [],
            "conexoes_ativas": [],
            "tabelas_dead_tuples": [],
            "erro": str(exc.__class__.__name__),
        }

    return {
        "banco": nome_banco,
        "queries_lentas": queries_lentas,
        "conexoes_ativas": conexoes_ativas,
        "tabelas_dead_tuples": tabelas_dead_tuples,
        "erro": None,
    }


def coletar_monitoramento(banco: Optional[str], limit: int) -> list[dict]:
    bancos = [banco] if banco else BANCOS_VALIDOS
    return [coletar_banco(nome_banco, limit) for nome_banco in bancos]
