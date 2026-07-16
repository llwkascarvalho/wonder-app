# Manutenção do PostgreSQL — Wonder App

Este documento descreve os scripts de manutenção automatizada dos quatro
bancos PostgreSQL do sistema (`db_autenticacao`, `db_catalogo`,
`db_agendamentos`, `db_notificacoes`).

## Scripts disponíveis

### `scripts/maintenance.sh`

O que faz: executa `VACUUM ANALYZE` e `REINDEX TABLE` nas tabelas
principais dos quatro bancos.

- `VACUUM ANALYZE` recupera o espaço ocupado por linhas mortas (deixadas
  por UPDATE/DELETE) e atualiza as estatísticas usadas pelo otimizador de
  consultas do PostgreSQL.
- `REINDEX TABLE` reconstrói os índices das tabelas, evitando que fiquem
  fragmentados/inchados ao longo do tempo.

Tabelas cobertas por banco:

| Banco             | Tabelas                                                                 |
|--------------------|--------------------------------------------------------------------------|
| db_autenticacao    | customuser, logs_auditoria                                              |
| db_catalogo        | categoria, prestador, prestador_categoria, servico, horariofuncionamento, avaliacao, logs_auditoria |
| db_agendamentos    | agendamento, historico_agendamento, logs_auditoria                      |
| db_notificacoes    | notificacao, logs_auditoria                                             |

> Nota: os nomes das tabelas são em minúsculas propositalmente — o
> PostgreSQL guarda identificadores sem aspas sempre em minúsculas, e é
> assim que elas foram criadas em `sql/*.sql` e mapeadas no ORM
> (`__tablename__`).

### `scripts/cleanup_logs.sh`

O que faz: remove da tabela `logs_auditoria` (presente nos quatro bancos)
os registros com `data_hora` anterior a 90 dias, evitando que a tabela de
auditoria cresça indefinidamente.

O período de retenção é configurável via variável de ambiente
`DIAS_RETENCAO` (padrão: 90).

## Quando executar

- **`maintenance.sh`**: recomenda-se rodar semanalmente, ou após grandes
  volumes de INSERT/UPDATE/DELETE (ex: testes de carga, importações).
- **`cleanup_logs.sh`**: recomenda-se rodar mensalmente, para manter a
  tabela de auditoria com tamanho controlado.

Ambos podem ser agendados via `cron` no mesmo container.

## Como executar

Pré-requisito: os containers dos bancos precisam estar em execução
(`docker compose up -d db_auth db_catalogo db_agendamentos db_notificacoes`).

```bash
# Dar permissão de execução (uma vez só, ou no Git Bash / WSL no Windows)
chmod +x scripts/maintenance.sh scripts/cleanup_logs.sh

# Rodar a manutenção (VACUUM ANALYZE + REINDEX)
./scripts/maintenance.sh

# Rodar a limpeza de logs antigos
./scripts/cleanup_logs.sh
```

Ambos os scripts imprimem no terminal qual banco e qual operação estão
sendo executados a cada passo, e finalizam com um resumo de início/fim.

### Alternativa: executar direto via `docker compose exec`

Caso prefira rodar comandos avulsos sem os scripts, por exemplo direto no
Postgres do catálogo:

```bash
docker compose exec db_catalogo psql -U wonder_user -d db_catalogo -c "VACUUM ANALYZE prestador;"
```

## Exemplo de saída esperada

```
=== Wonder App — Manutenção do PostgreSQL (VACUUM ANALYZE + REINDEX) ===
Iniciado em: 2026-07-03 15:20:00

--- Banco: db_autenticacao (serviço: db_auth) ---
[db_autenticacao] VACUUM ANALYZE customuser...
VACUUM
[db_autenticacao] REINDEX TABLE customuser...
REINDEX
...
=== Manutenção finalizada em: 2026-07-03 15:20:12 ===
```
