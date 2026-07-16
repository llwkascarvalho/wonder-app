# Alertas de Banco de Dados — Wonder App

Este documento descreve o sistema de alertas para situações críticas nos
quatro bancos PostgreSQL do sistema, conforme exigido pela Entrega 2.

## O que o script verifica

`scripts/alerts.py` analisa três condições em cada um dos quatro bancos
(`db_autenticacao`, `db_catalogo`, `db_agendamentos`, `db_notificacoes`):

### 1. Excesso de conexões ativas

Compara o número de conexões ativas (`pg_stat_activity`) com o limite
máximo configurado no PostgreSQL (`max_connections`). Se o percentual de
uso ultrapassar o threshold, gera um alerta.

- **Por quê importa:** se o banco atingir o limite de conexões, novas
  requisições passam a ser recusadas, derrubando o sistema.

### 2. Locks de longa duração

Verifica, via `pg_locks` e `pg_stat_activity`, se existe alguma conexão
seguindo uma consulta há mais tempo que o limite configurado.

- **Por quê importa:** locks muito longos costumam travar outras
  operações no banco (ex: um agendamento que fica preso esperando outra
  transação liberar a mesma linha).

### 3. Tabelas com muitos "dead tuples" sem VACUUM recente

Consulta `pg_stat_user_tables` em busca de tabelas com volume de linhas
mortas (`n_dead_tup`, deixadas por UPDATE/DELETE) acima do limite, **e**
sem um VACUUM (manual ou automático) nos últimos 7 dias.

- **Por quê importa:** tabelas assim ficam maiores e mais lentas do que
  precisariam, prejudicando a performance das consultas.

## Thresholds (limites configuráveis)

Configuráveis via variáveis de ambiente no `.env` da raiz do projeto:

| Variável                      | Padrão  | Significado                                            |
|--------------------------------|---------|----------------------------------------------------------|
| `ALERT_MAX_CONNECTIONS_PCT`    | `80`    | % de conexões ativas em relação ao `max_connections`    |
| `ALERT_LOCK_SECONDS`           | `30`    | Duração (segundos) a partir da qual uma query é um alerta|
| `ALERT_DEAD_TUP_THRESHOLD`     | `10000` | Nº de dead tuples a partir do qual a tabela é analisada  |

Se essas variáveis não estiverem definidas no `.env`, o script usa os
valores padrão acima automaticamente.

## Como executar

### Pré-requisitos

1. Os containers dos bancos precisam estar rodando:
   ```bash
   docker compose up -d db_auth db_catalogo db_agendamentos db_notificacoes
   ```
2. Instalar as dependências Python (uma vez só):
   ```bash
   pip install -r scripts/requirements-alerts.txt
   ```

O script carrega automaticamente o `.env` da raiz do projeto — não é
necessário exportar nenhuma variável manualmente no terminal.

### Executar

```bash
python scripts/alerts.py
```

O script conecta em cada um dos quatro bancos (via `localhost`, nas portas
expostas pelo `docker-compose.yml`: `5433` a `5436`), analisa as três
condições, e imprime um resumo no terminal.

## Onde ficam os alertas registrados

Sempre que uma condição crítica é detectada, uma linha é adicionada ao
arquivo `logs/alerts.log` (criado automaticamente na primeira execução),
no formato:

```
[2026-07-10T19:42:24+0000] banco=db_catalogo metrica=conexoes_ativas_pct valor=85.0% (limite: 80.0%)
[2026-07-10T19:42:24+0000] banco=db_agendamentos metrica=lock_duracao_segundos valor=pid=123 duracao=45s
[2026-07-10T19:42:24+0000] banco=db_notificacoes metrica=dead_tuples valor=tabela=notificacao dead_tup=15000 ultimo_vacuum=2026-06-30 12:00:00+00:00
```

Cada linha traz: data/hora, banco afetado, qual métrica disparou o alerta,
e o valor detectado (formato varia por métrica, mas sempre legível).

**Se nenhuma condição crítica for encontrada**, o arquivo de log não
recebe nenhuma linha nova — só o resumo aparece no terminal.

## Quando executar

Recomenda-se rodar periodicamente (ex: a cada 15-30 minutos via `cron`),
no mesmo container que futuramente executará o backup e a manutenção
automatizados, ou manualmente sempre que houver suspeita de lentidão no
sistema.

## Como testar se está funcionando

1. **Cenário normal:** com o ambiente recém-criado e pouco uso, rodar o
   script não deve gerar nenhuma linha em `logs/alerts.log` (conexões e
   dead tuples baixos, sem locks longos).
2. **Simulando um alerta:** para testar o alerta de dead tuples, por
   exemplo, é possível gerar bastante UPDATE/DELETE em uma tabela sem
   rodar `VACUUM` depois (veja `scripts/maintenance.sh` para o comando de
   VACUUM manual, útil para reverter o cenário de teste depois).
