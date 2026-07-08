#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"

mkdir -p "$BACKUP_DIR"

backup_db() {
  service_name="$1"
  db_host="$2"
  db_name="$3"
  db_user="$4"
  db_password="$5"
  output_file="${BACKUP_DIR}/${service_name}_${TIMESTAMP}.sql.gz"

  if [ -z "$db_password" ]; then
    echo "ERRO: senha não configurada para ${service_name}." >&2
    exit 1
  fi

  echo "Iniciando backup de ${service_name}..."

  PGPASSWORD="$db_password" pg_dump \
    -h "$db_host" \
    -p 5432 \
    -U "$db_user" \
    -d "$db_name" \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip > "$output_file"

  gzip -t "$output_file"
  echo "Backup concluído: ${output_file}"
}

backup_db "auth" "db_auth" "db_autenticacao" "${AUTH_DB_USER:-wonder_user}" "${AUTH_DB_PASSWORD:-}"
backup_db "catalogo" "db_catalogo" "db_catalogo" "${CATALOGO_DB_USER:-wonder_user}" "${CATALOGO_DB_PASSWORD:-}"
backup_db "agendamentos" "db_agendamentos" "db_agendamentos" "${AGENDAMENTOS_DB_USER:-wonder_user}" "${AGENDAMENTOS_DB_PASSWORD:-}"
backup_db "notificacoes" "db_notificacoes" "db_notificacoes" "${NOTIFICACOES_DB_USER:-wonder_user}" "${NOTIFICACOES_DB_PASSWORD:-}"

echo "Aplicando rotação: removendo backups com mais de ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Rotina de backup finalizada em $(date '+%Y-%m-%dT%H:%M:%S%z')."
