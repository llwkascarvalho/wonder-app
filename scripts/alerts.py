#!/usr/bin/env python3
"""
scripts/alerts.py

Detecta situações críticas nos quatro bancos PostgreSQL do Wonder App:
 excesso de conexões ativas, locks de longa duração e tabelas
com alto volume de dead tuples sem VACUUM recente.

Uso:
    python scripts/alerts.py

Pré-requisito: os containers dos bancos precisam estar rodando
(docker compose up -d db_auth db_catalogo db_agendamentos db_notificacoes),
com as portas expostas ao host (5433-5436, já configuradas no
docker-compose.yml).

Dependências: psycopg2-binary, python-dotenv
(pip install -r scripts/requirements-alerts.txt)
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# Este script roda no host (não dentro de um container), então, ao
# contrário dos scripts .sh que usam `docker compose exec`, ele precisa
# carregar o .env da raiz do projeto manualmente.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# service_docker_compose | nome_do_banco | porta exposta ao host
DATABASES = [
    ("db_auth", "db_autenticacao", 5433),
    ("db_catalogo", "db_catalogo", 5434),
    ("db_agendamentos", "db_agendamentos", 5435),
    ("db_notificacoes", "db_notificacoes", 5436),
]

DB_HOST = os.environ.get("ALERTS_DB_HOST", "localhost")
DB_USER = os.environ.get("AUTH_DB_USER", "wonder_user")

# Thresholds configuráveis via variáveis de ambiente (.env)
MAX_CONNECTIONS_PCT = float(os.environ.get("ALERT_MAX_CONNECTIONS_PCT", "80"))
LOCK_SECONDS = int(os.environ.get("ALERT_LOCK_SECONDS", "30"))
DEAD_TUP_THRESHOLD = int(os.environ.get("ALERT_DEAD_TUP_THRESHOLD", "10000"))

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "alerts.log"

# Senha de cada banco: reaproveita as mesmas variáveis já usadas pelos
# outros scripts/serviços (definidas no .env raiz do projeto).
PASSWORD_ENV_BY_SERVICE = {
    "db_auth": "AUTH_DB_PASSWORD",
    "db_catalogo": "CATALOGO_DB_PASSWORD",
    "db_agendamentos": "AGENDAMENTOS_DB_PASSWORD",
    "db_notificacoes": "NOTIFICACOES_DB_PASSWORD",
}


def registrar_alerta(banco: str, metrica: str, valor: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")
    linha = f"[{timestamp}] banco={banco} metrica={metrica} valor={valor}\n"

    with open(LOG_FILE, "a", encoding="utf-8") as arquivo:
        arquivo.write(linha)

    print(f"  ALERTA registrado: {metrica} = {valor}")


def conectar(servico: str, banco: str, porta: int):
    senha_env = PASSWORD_ENV_BY_SERVICE[servico]
    senha = os.environ.get(senha_env)

    if not senha:
        print(f"[{banco}] ERRO: variável {senha_env} não configurada. Pulando.", file=sys.stderr)
        return None

    return psycopg2.connect(
        host=DB_HOST,
        port=porta,
        dbname=banco,
        user=DB_USER,
        password=senha,
        connect_timeout=5,
    )


def verificar_conexoes(cur, banco: str) -> None:
    cur.execute("SHOW max_connections;")
    max_conexoes = int(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM pg_stat_activity;")
    conexoes_ativas = cur.fetchone()[0]

    percentual = (conexoes_ativas / max_conexoes) * 100

    print(f"[{banco}] Conexões ativas: {conexoes_ativas}/{max_conexoes} ({percentual:.1f}%)")

    if percentual >= MAX_CONNECTIONS_PCT:
        registrar_alerta(
            banco,
            "conexoes_ativas_pct",
            f"{percentual:.1f}% (limite: {MAX_CONNECTIONS_PCT}%)",
        )


def verificar_locks(cur, banco: str) -> None:
    cur.execute(
        """
        SELECT DISTINCT
            pg_stat_activity.pid,
            EXTRACT(EPOCH FROM (NOW() - pg_stat_activity.query_start))::int AS duracao_seg
        FROM pg_stat_activity
        JOIN pg_locks ON pg_locks.pid = pg_stat_activity.pid
        WHERE pg_stat_activity.state != 'idle'
          AND pg_stat_activity.query_start IS NOT NULL
        ORDER BY duracao_seg DESC;
        """
    )
    locks_longos = [row for row in cur.fetchall() if row[1] is not None and row[1] >= LOCK_SECONDS]

    print(f"[{banco}] Locks com duração >= {LOCK_SECONDS}s: {len(locks_longos)}")

    for pid, duracao in locks_longos:
        registrar_alerta(banco, "lock_duracao_segundos", f"pid={pid} duracao={duracao}s")


def verificar_dead_tuples(cur, banco: str) -> None:
    cur.execute(
        """
        SELECT relname, n_dead_tup, last_vacuum, last_autovacuum
        FROM pg_stat_user_tables
        WHERE n_dead_tup > %s;
        """,
        (DEAD_TUP_THRESHOLD,),
    )
    tabelas = cur.fetchall()

    print(f"[{banco}] Tabelas com dead tuples acima de {DEAD_TUP_THRESHOLD}: {len(tabelas)}")

    for tabela, dead_tup, last_vacuum, last_autovacuum in tabelas:
        ultimo_vacuum = max(filter(None, [last_vacuum, last_autovacuum]), default=None)

        sem_vacuum_recente = ultimo_vacuum is None or (
            datetime.now(ultimo_vacuum.tzinfo) - ultimo_vacuum
        ).days >= 7

        if sem_vacuum_recente:
            registrar_alerta(
                banco,
                "dead_tuples",
                f"tabela={tabela} dead_tup={dead_tup} ultimo_vacuum={ultimo_vacuum or 'nunca'}",
            )


def main() -> None:
    print("=== Wonder App — Verificação de alertas do PostgreSQL ===")
    print(f"Iniciado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(
        f"Thresholds: conexões >= {MAX_CONNECTIONS_PCT}% | "
        f"locks >= {LOCK_SECONDS}s | dead tuples >= {DEAD_TUP_THRESHOLD}\n"
    )

    for servico, banco, porta in DATABASES:
        conexao = conectar(servico, banco, porta)

        if conexao is None:
            continue

        try:
            with conexao, conexao.cursor() as cur:
                verificar_conexoes(cur, banco)
                verificar_locks(cur, banco)
                verificar_dead_tuples(cur, banco)
        except psycopg2.Error as erro:
            print(f"[{banco}] ERRO ao consultar: {erro}", file=sys.stderr)
        finally:
            conexao.close()

        print()

    print(f"=== Verificação finalizada. Log: {LOG_FILE} ===")


if __name__ == "__main__":
    main()
