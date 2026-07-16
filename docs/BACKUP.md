# Backup e restore dos bancos

Este projeto possui um container `backup` para gerar dumps dos bancos PostgreSQL dos microsserviços:

- `db_autenticacao`
- `db_catalogo`
- `db_agendamentos`
- `db_notificacoes`

Os arquivos são salvos no volume Docker persistente `backups_data`, montado no container em `/backups`.

## Backup automático

O serviço `backup` executa `scripts/backup.sh` ao iniciar e repete a execução a cada 24 horas.

Se precisar alterar o intervalo, configure `BACKUP_INTERVAL_SECONDS` no ambiente do container.

Para subir o serviço junto do ambiente:

```bash
docker compose up -d backup
```

O script gera arquivos `.sql.gz` e remove backups com mais de 7 dias.

## Backup manual

Execute:

```bash
docker compose run --rm backup sh /scripts/backup.sh
```

Para listar os arquivos gerados no volume:

```bash
docker compose run --rm backup sh -c "ls -lh /backups"
```

Para validar a integridade de um arquivo:

```bash
docker compose run --rm backup sh -c "gzip -t /backups/NOME_DO_ARQUIVO.sql.gz"
```

## Restore

Antes de restaurar, confirme que está no ambiente correto. Restore sobrescreve ou duplica dados conforme o conteúdo do dump e o estado atual do banco.

Os comandos abaixo restauram arquivos diretamente do volume `backups_data` para os containers dos bancos.

### Auth

```bash
docker compose run --rm backup sh -c "gunzip -c /backups/auth_ARQUIVO.sql.gz" | docker exec -i wonder_db_auth psql -U wonder_user -d db_autenticacao
```

### Catálogo

```bash
docker compose run --rm backup sh -c "gunzip -c /backups/catalogo_ARQUIVO.sql.gz" | docker exec -i wonder_db_catalogo psql -U wonder_user -d db_catalogo
```

### Agendamentos

```bash
docker compose run --rm backup sh -c "gunzip -c /backups/agendamentos_ARQUIVO.sql.gz" | docker exec -i wonder_db_agendamentos psql -U wonder_user -d db_agendamentos
```

### Notificações

```bash
docker compose run --rm backup sh -c "gunzip -c /backups/notificacoes_ARQUIVO.sql.gz" | docker exec -i wonder_db_notificacoes psql -U wonder_user -d db_notificacoes
```

Substitua `*_ARQUIVO.sql.gz` pelo nome real listado em `/backups`.

## Cópia local opcional para desenvolvimento

O backup oficial fica no volume Docker `backups_data`. Se precisar copiar arquivos para a máquina local durante desenvolvimento, use uma pasta local `backups/`; ela está ignorada pelo Git.

Exemplo:

```bash
mkdir -p backups
docker run --rm -v wonder-app_backups_data:/backups -v "$PWD/backups:/out" alpine sh -c "cp /backups/*.sql.gz /out/ 2>/dev/null || true"
```

Se o nome do volume variar conforme o diretório/projeto Docker Compose, consulte com:

```bash
docker volume ls
```
