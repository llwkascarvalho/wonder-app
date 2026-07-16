from __future__ import annotations

import argparse
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable

import psycopg2
from psycopg2.extras import RealDictCursor

BANCOS = {
    "auth": "AUTH",
    "catalogo": "CATALOGO",
    "agendamentos": "AGENDAMENTOS",
    "notificacoes": "NOTIFICACOES",
}

QUERY_LENTAS_SQL = """
SELECT
    LEFT(query, 500) AS query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
WHERE query NOT ILIKE 'CREATE EXTENSION%%'
  AND query NOT ILIKE 'CREATE FUNCTION%%'
  AND query NOT ILIKE 'CREATE VIEW%%'
  AND query NOT ILIKE 'CREATE OR REPLACE FUNCTION%%'
  AND query NOT ILIKE 'CREATE OR REPLACE VIEW%%'
  AND query NOT ILIKE 'DROP VIEW%%'
  AND query NOT ILIKE 'DROP FUNCTION%%'
  AND query NOT ILIKE 'COMMENT ON%%'
  AND query NOT ILIKE 'ALTER EXTENSION%%'
  AND query NOT ILIKE '%%pg_stat_statements%%'
  AND query NOT ILIKE '%%pg_stat_activity%%'
  AND query NOT ILIKE '%%pg_stat_user_tables%%'
  AND query NOT ILIKE '%%pg_type%%'
  AND query NOT ILIKE '%%pg_namespace%%'
  AND query NOT ILIKE '%%pg_extension%%'
  AND query NOT ILIKE '%%pg_catalog.version%%'
  AND query NOT ILIKE 'select current_schema%%'
  AND query NOT ILIKE 'show transaction isolation level%%'
  AND query NOT ILIKE 'show standard_conforming_strings%%'
  AND query NOT ILIKE 'show shared_preload_libraries%%'
  AND query NOT ILIKE 'begin%%'
  AND query NOT ILIKE 'commit%%'
  AND query NOT ILIKE 'rollback%%'
  AND query NOT ILIKE 'select $%%'
ORDER BY mean_exec_time DESC
LIMIT %s;
"""

CONEXOES_ATIVAS_SQL = """
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
LIMIT %s;
"""

DEAD_TUPLES_SQL = """
SELECT
    schemaname AS schema_name,
    relname AS tabela,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC, relname
LIMIT %s;
"""


def carregar_env(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def db_config(prefix: str) -> dict:
    return {
        "host": os.environ[f"{prefix}_DB_HOST"],
        "port": os.environ[f"{prefix}_DB_PORT"],
        "dbname": os.environ[f"{prefix}_DB_NAME"],
        "user": os.environ[f"{prefix}_DB_USER"],
        "password": os.environ[f"{prefix}_DB_PASSWORD"],
    }


def consultar(conn, sql: str, limit: int) -> list[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (limit,))
        return [dict(row) for row in cursor.fetchall()]


def coletar_banco(nome: str, prefix: str, limit: int) -> dict:
    try:
        with psycopg2.connect(**db_config(prefix)) as conn:
            return {
                "banco": nome,
                "queries_lentas": consultar(conn, QUERY_LENTAS_SQL, limit),
                "conexoes_ativas": consultar(conn, CONEXOES_ATIVAS_SQL, limit),
                "tabelas_dead_tuples": consultar(conn, DEAD_TUPLES_SQL, limit),
                "erro": None,
            }
    except Exception as exc:
        return {
            "banco": nome,
            "queries_lentas": [],
            "conexoes_ativas": [],
            "tabelas_dead_tuples": [],
            "erro": exc.__class__.__name__,
        }


def markdown_table(headers: list[str], rows: Iterable[Iterable[object]]) -> list[str]:
    output = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]

    for row in rows:
        output.append("| " + " | ".join(sanitize_cell(value) for value in row) + " |")

    return output


def sanitize_cell(value: object) -> str:
    if value is None:
        return "-"
    text = str(value).replace("\n", " ").replace("|", "\\|")
    return text[:300]


def gerar_markdown(resultados: list[dict], output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"monitor_{timestamp}.md"

    lines = [
        "# Relatorio de Monitoramento",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        "",
    ]

    for resultado in resultados:
        lines.extend([f"## Banco: {resultado['banco']}", ""])

        if resultado["erro"]:
            lines.extend([f"Erro ao coletar metricas: `{resultado['erro']}`", ""])
            continue

        lines.extend(["### Top queries mais lentas", ""])
        lines.extend(
            markdown_table(
                ["calls", "mean_exec_time", "total_exec_time", "rows", "query"],
                [
                    [
                        item["calls"],
                        round(float(item["mean_exec_time"]), 3),
                        round(float(item["total_exec_time"]), 3),
                        item["rows"],
                        item["query"],
                    ]
                    for item in resultado["queries_lentas"]
                ],
            )
        )
        lines.append("")

        lines.extend(["### Conexoes ativas", ""])
        lines.extend(
            markdown_table(
                ["pid", "usuario", "aplicacao", "cliente", "estado", "duracao_segundos", "query"],
                [
                    [
                        item["pid"],
                        item["usuario"],
                        item["aplicacao"],
                        item["cliente"],
                        item["estado"],
                        round(float(item["duracao_segundos"] or 0), 3),
                        item["query"],
                    ]
                    for item in resultado["conexoes_ativas"]
                ],
            )
        )
        lines.append("")

        lines.extend(["### Tabelas com mais dead tuples", ""])
        lines.extend(
            markdown_table(
                ["schema", "tabela", "live_tuples", "dead_tuples", "last_vacuum", "last_autovacuum"],
                [
                    [
                        item["schema_name"],
                        item["tabela"],
                        item["live_tuples"],
                        item["dead_tuples"],
                        item["last_vacuum"],
                        item["last_autovacuum"],
                    ]
                    for item in resultado["tabelas_dead_tuples"]
                ],
            )
        )
        lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera relatorio de monitoramento PostgreSQL do Wonder.")
    parser.add_argument("--env", default=".env.monitor", help="Arquivo com variaveis restritas dos bancos.")
    parser.add_argument("--limit", type=int, default=10, help="Quantidade de itens por secao.")
    parser.add_argument("--output-dir", default="docs/reports", help="Diretorio de saida do Markdown.")
    args = parser.parse_args()

    carregar_env(Path(args.env))

    resultados = [
        coletar_banco(nome, prefix, args.limit)
        for nome, prefix in BANCOS.items()
    ]
    output_path = gerar_markdown(resultados, Path(args.output_dir))
    print(f"Relatorio gerado em: {output_path}", flush=True)


if __name__ == "__main__":
    main()
