# Monitoramento PostgreSQL

Este monitoramento usa `pg_stat_statements`, `pg_stat_activity` e `pg_stat_user_tables` nos quatro bancos do Wonder:

- `db_autenticacao`
- `db_catalogo`
- `db_agendamentos`
- `db_notificacoes`

## Ativar pg_stat_statements

Em ambientes criados do zero pelo Docker Compose, os containers PostgreSQL ja sobem com:

```txt
shared_preload_libraries=pg_stat_statements
pg_stat_statements.track=all
```

Os scripts de inicializacao em `sql/*.sql` tambem executam:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Para bancos ja existentes, reinicie os containers apos a alteracao do `docker-compose.yml` e aplique manualmente:

```bash
docker compose exec -T db_auth psql -U wonder_user -d db_autenticacao < sql/monitoramento_pg_stat_statements.sql
docker compose exec -T db_catalogo psql -U wonder_user -d db_catalogo < sql/monitoramento_pg_stat_statements.sql
docker compose exec -T db_agendamentos psql -U wonder_user -d db_agendamentos < sql/monitoramento_pg_stat_statements.sql
docker compose exec -T db_notificacoes psql -U wonder_user -d db_notificacoes < sql/monitoramento_pg_stat_statements.sql
```

Valide em cada banco:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
SELECT COUNT(*) FROM pg_stat_statements;
```

## Configuracao Restrita Do Monitor

O monitor nao usa o `.env` completo da aplicacao. Crie um arquivo local restrito a partir do exemplo:

```bash
cp .env.monitor.example .env.monitor
```

No PowerShell:

```powershell
Copy-Item .env.monitor.example .env.monitor
```

Preencha apenas as variaveis de conexao dos quatro bancos. Nao inclua JWT, segredos OAuth, chaves de IA ou outros tokens nesse arquivo.

O arquivo `.env.monitor` precisa existir antes de recriar o container Admin, pois ele e montado em `/app/.env.monitor` pelo Docker Compose. Ele e ignorado pelo Git.

## Gerar Relatorio Markdown

Execute dentro do container Admin, onde os hosts internos do Docker Compose (`db_auth`, `db_catalogo`, `db_agendamentos`, `db_notificacoes`) resolvem corretamente:

```bash
docker compose exec admin python /app/scripts/monitor.py --env /app/.env.monitor
```

O relatorio sera gerado em:

```txt
docs/reports/monitor_{timestamp}.md
```

Tambem e possivel ajustar o limite por secao:

```bash
docker compose exec admin python /app/scripts/monitor.py --env /app/.env.monitor --limit 10
```

O diretorio `docs/reports` e montado no container Admin em `/app/docs/reports`, entao o arquivo gerado dentro do container fica disponivel no host. Os relatorios `monitor_*.md` sao ignorados pelo Git.

## Interpretar Metricas

### Queries lentas

Fonte: `pg_stat_statements`.

O relatorio lista as 10 queries com maior `mean_exec_time` por banco. Use isso para encontrar consultas lentas em media, mesmo que nao sejam as mais frequentes.

Campos principais:

- `calls`: quantas vezes a query foi executada.
- `mean_exec_time`: tempo medio de execucao.
- `total_exec_time`: tempo total acumulado.
- `rows`: linhas retornadas/processadas pela query.

### Conexoes ativas

Fonte: `pg_stat_activity`.

Mostra sessoes ativas no banco no momento da coleta. Muitas conexoes ativas ou queries com duracao alta podem indicar gargalo, lock ou consulta sem indice adequado.

### Dead tuples

Fonte: `pg_stat_user_tables`.

`dead_tuples` alto indica linhas mortas acumuladas por updates/deletes. Isso pode exigir `VACUUM`, ajuste de autovacuum ou revisao de tabelas com alto churn.

## Frequencia Recomendada

- Ambiente local/dev: executar sob demanda, apos testes de carga ou fluxos criticos.
- Homologacao: executar diariamente durante ciclos de teste.
- Producao: executar diariamente e sempre apos incidentes de lentidao.

## Testar Endpoint Admin

Direto no servico Admin:

```bash
curl -H "X-User-Role: admin" http://localhost:8006/admin/monitoramento
```

Filtrando banco:

```bash
curl -H "X-User-Role: admin" "http://localhost:8006/admin/monitoramento?banco=agendamentos&limit=10"
```

Via Gateway com JWT admin:

```bash
curl -H "Authorization: Bearer <JWT_ADMIN>" http://localhost:8000/admin/monitoramento
```

Sem permissao admin, o endpoint deve retornar `403`.
