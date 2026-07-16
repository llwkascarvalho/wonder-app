#!/usr/bin/env bash
#
# scripts/cleanup_logs.sh
#
# Remove registros da tabela logs_auditoria com mais de 90 dias em cada
# um dos quatro bancos PostgreSQL do Wonder App (Issue 25).
#
# Uso:
#   ./scripts/cleanup_logs.sh
#
# Pré-requisito: os containers dos bancos precisam estar rodando.
#
set -euo pipefail

# service_docker_compose | nome_do_banco
DATABASES=(
  "db_auth|db_autenticacao"
  "db_catalogo|db_catalogo"
  "db_agendamentos|db_agendamentos"
  "db_notificacoes|db_notificacoes"
)

DB_USER="${DB_USER:-wonder_user}"
DIAS_RETENCAO="${DIAS_RETENCAO:-90}"

echo "=== Wonder App — Limpeza de logs_auditoria (mais de ${DIAS_RETENCAO} dias) ==="
echo "Iniciado em: $(date '+%Y-%m-%d %H:%M:%S')"
echo

for entry in "${DATABASES[@]}"; do
  IFS='|' read -r servico banco <<< "$entry"

  echo "--- Banco: ${banco} (serviço: ${servico}) ---"
  echo "[${banco}] Removendo registros de logs_auditoria anteriores a ${DIAS_RETENCAO} dias..."

  docker compose exec -T "${servico}" psql -U "${DB_USER}" -d "${banco}" \
    -c "DELETE FROM logs_auditoria WHERE data_hora < NOW() - INTERVAL '${DIAS_RETENCAO} days';"

  echo "[${banco}] Concluído."
  echo
done

echo "=== Limpeza finalizada em: $(date '+%Y-%m-%d %H:%M:%S') ==="
