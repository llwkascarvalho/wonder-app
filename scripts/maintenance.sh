#!/usr/bin/env bash
#
# scripts/maintenance.sh
#
# Executa VACUUM ANALYZE e REINDEX nas tabelas principais dos quatro
# bancos PostgreSQL do Wonder App (Issue 25).
#
# Uso:
#   ./scripts/maintenance.sh
#
# Pré-requisito: os containers dos bancos precisam estar rodando
# (docker compose up -d db_auth db_catalogo db_agendamentos db_notificacoes)
#
set -euo pipefail

# service_docker_compose | nome_do_banco | tabelas (separadas por espaço)
#
# Nomes em minúsculas propositalmente: o PostgreSQL guarda identificadores
# não citados (sem aspas) sempre em minúsculas, e é assim que as tabelas
# foram criadas nos scripts sql/*.sql e mapeadas no ORM (__tablename__).
DATABASES=(
  "db_auth|db_autenticacao|customuser logs_auditoria"
  "db_catalogo|db_catalogo|categoria prestador prestador_categoria servico horariofuncionamento avaliacao logs_auditoria"
  "db_agendamentos|db_agendamentos|agendamento historico_agendamento logs_auditoria"
  "db_notificacoes|db_notificacoes|notificacao logs_auditoria"
)

DB_USER="${DB_USER:-wonder_user}"

echo "=== Wonder App — Manutenção do PostgreSQL (VACUUM ANALYZE + REINDEX) ==="
echo "Iniciado em: $(date '+%Y-%m-%d %H:%M:%S')"
echo

for entry in "${DATABASES[@]}"; do
  IFS='|' read -r servico banco tabelas <<< "$entry"

  echo "--- Banco: ${banco} (serviço: ${servico}) ---"

  for tabela in $tabelas; do
    echo "[${banco}] VACUUM ANALYZE ${tabela}..."
    docker compose exec -T "${servico}" psql -U "${DB_USER}" -d "${banco}" \
      -c "VACUUM ANALYZE ${tabela};"

    echo "[${banco}] REINDEX TABLE ${tabela}..."
    docker compose exec -T "${servico}" psql -U "${DB_USER}" -d "${banco}" \
      -c "REINDEX TABLE ${tabela};"
  done

  echo "[${banco}] Concluído."
  echo
done

echo "=== Manutenção finalizada em: $(date '+%Y-%m-%d %H:%M:%S') ==="
