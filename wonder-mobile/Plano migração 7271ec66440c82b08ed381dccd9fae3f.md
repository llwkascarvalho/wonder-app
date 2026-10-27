# Plano migração

# Plano migração PI III

## 1. Objetivo do Documento

Este documento resume o que precisa mudar para migrar o Wonder do backend antigo em Python/FastAPI para Java/Spring Boot, sem quebrar o app mobile.

O objetivo e definir os contratos de API, as principais decisoes tecnicas, os problemas do sistema atual que nao devem ser repetidos e uma ordem inicial de execucao para a equipe.

## 2. Glossario

| Termo | Significado simples |
| --- | --- |
| AS-IS | Como o sistema existe hoje. |
| TO-BE | Como o sistema deve ficar depois da migracao. |
| P0 | Prioridade maxima: o app mobile usa hoje ou bloqueia o fluxo principal. |
| P1 | Importante para o PI III ou para a arquitetura oficial. |
| P2 | Melhoria ou item que pode ficar para depois. |
| Core | Aplicacao principal em Spring Boot. Vai concentrar auth, catalogo, agendamentos e admin. |
| Worker | Servico separado que processa tarefas em segundo plano. |
| RabbitMQ | Fila de mensagens para tarefas assincronas, como notificacoes e exportacoes. |
| MinIO | Armazenamento de arquivos, como fotos e relatorios. |
| Keycloak | Sistema de login, usuarios e papeis. |

## 3. Escopo da Migracao

Entra na migracao:

- backend Java/Spring Boot;
- app mobile atual consumindo a nova API;
- login com Keycloak;
- banco PostgreSQL;
- fotos em MinIO;
- mensagens com RabbitMQ;
- notificacoes;
- admin;
- exportacoes exigidas pelo PI III.

Fica fora deste primeiro momento:

- refazer o design do app mobile;
- decidir a tecnologia ou criação do frontend web;
- melhorar tudo que existe no sistema antigo antes de ter o fluxo principal funcionando.

## 4. Arquitetura Simplificada

| Componente | Papel no sistema |
| --- | --- |
| Core Spring Boot | API principal. Contem auth/perfil, catalogo, agendamentos e admin. |
| Notification Service | Consome eventos de agendamento e cria notificacoes. |
| Export Worker | Gera arquivos de exportacao em segundo plano. |
| PostgreSQL | Banco principal da aplicacao. |
| RabbitMQ | Fila para eventos assincronos. |
| MinIO | Guarda fotos e arquivos exportados. |
| Keycloak | Login e papeis de usuario. |
| App mobile | Frontend atual que precisa continuar funcionando. |
| Frontend web | Novo frontend, ainda com tecnologia em aberto. |

## 5. Perfis de Usuario

| Perfil | O que pode fazer |
| --- | --- |
| cliente | Ver catalogo, agendar servicos, cancelar agendamentos, ver notificacoes. |
| prestador | Cadastrar perfil, servicos, horarios, ver agenda e atualizar status de agendamentos. |
| admin | Aprovar prestadores, gerenciar categorias, consultar auditoria e monitoramento. |

## 6. Decisões Principais

| ID | Decisao | Motivo |
| --- | --- | --- |
| DEC-S-001 | Login deve ser feito direto pelo app com Keycloak usando Authorization Code + PKCE. | Evita criar uma rota temporaria no Core so para devolver token na URL. |
| DEC-S-002 | `GET /auth/me` deve devolver o id local numerico do usuario. | O app hoje compara usuario com `prestador.usuario_id`; no Keycloak o `sub` e UUID. |
| DEC-S-003 | Core sera o dono das regras principais. | Evita chamadas HTTP internas entre servicos que agora estarao no mesmo Core. |
| DEC-S-004 | Notificacoes e exportacoes usam RabbitMQ. | Exigencia da arquitetura definida nos ADRs e do PI III. |
| DEC-S-005 | Fotos e arquivos devem ir para MinIO. | Evita arquivo local dentro dos containers. |

## 7. Endpoints da API Alvo

O plano completo tem 72 itens TO-BE: 60 endpoints que ficam na API nova e 12 rotas antigas que devem ser removidas ou substituidas.

Prioridades:

- P0: necessário para o app mobile ou para o fluxo principal.
- P1: necessário para arquitetura, admin, infraestrutura ou requisito do PI III.
- P2: melhoria ou item que pode ficar depois do fluxo principal.

### Infraestrutura

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P1 | GET | `/health` | Health check do Core via Actuator/Micrometer. |

### Auth e Perfil

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 | GET | `/auth/me` | Deve devolver dados do usuario logado e id local numerico. |
| P0 | PATCH | `/auth/me` | Atualiza nome e telefone. |
| P0 | POST | `/auth/me/photo` | Upload de foto do perfil usando MinIO. |
| P1 | GET | `/auth/usuarios` | Admin lista usuarios. |
| P1 | GET | `/auth/usuarios/{user_id}` | Admin consulta usuario. |
| P1 | PATCH | `/auth/usuarios/{user_id}/tipo` | Admin troca tipo e sincroniza role no Keycloak. |

Login:

- nao criar `/auth/google/login` e `/auth/google/callback` no Core novo;
- o app deve usar Keycloak diretamente;
- depois do login, o app chama `GET /auth/me`.

### Catalogo

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 ✅ | GET | `/catalogo/prestadores` | Lista prestadores ativos. |
| P0 ✅ | GET | `/catalogo/categorias` | Lista categorias ativas. |
| P0 ✅ | GET | `/catalogo/prestadores/{prestador_id}` | Detalhe do prestador. |
| P0 ✅ | GET | `/catalogo/prestadores/{prestador_id}/servicos` | Lista servicos. |
| P0 ✅ | GET | `/catalogo/prestadores/{prestador_id}/horarios` | Lista horarios. |
| P0 ✅ | GET | `/catalogo/prestadores/{prestador_id}/categorias` | Lista categorias do prestador. |
| P0 ✅ | GET | `/catalogo/prestadores/me` | Prestador logado consulta seu cadastro. |
| P0 ATENÇÃO | POST | `/catalogo/prestadores`

Implementado como `POST /prestadores`; rota a alinhar com o plano. | Cria cadastro de prestador. |
| P0 ✅ | PUT | `/catalogo/prestadores/{prestador_id}` | Atualiza cadastro de prestador. |
| P0 ⚠️ | POST | `/catalogo/prestadores/{prestador_id}/foto` | Upload de foto do prestador. |
| P0 ✅ | POST | `/catalogo/prestadores/{prestador_id}/enviar-aprovacao` | Envia cadastro para aprovacao. |
| P0 ✅ | GET | `/catalogo/prestadores/me/categorias` | Lista categorias do prestador logado. |
| P0 🗑️ | POST | `/catalogo/prestadores/me/categorias` | Associa categorias ao prestador logado. |
| P0 🗑️ | DELETE | `/catalogo/prestadores/me/categorias/{categoria_id}` | Remove categoria do prestador logado. |
| P0 ✅ | POST | `/catalogo/prestadores/{prestador_id}/servicos` | Cria servico. |
| P0 ✅ | PUT | `/catalogo/prestadores/{prestador_id}/servicos/{servico_id}` | Edita servico. |
| P0 ✅ | DELETE | `/catalogo/prestadores/{prestador_id}/servicos/{servico_id}` | Nao deve apagar se houver agendamento aberto. |
| P0 ✅ | POST | `/catalogo/prestadores/{prestador_id}/horarios` | Cria horario. |
| P0 ✅ | DELETE | `/catalogo/prestadores/{prestador_id}/horarios/{horario_id}` | Remove horario. |
| P2 🗑️ | PUT | `/catalogo/prestadores/me/categorias` | Substitui todas as categorias do prestador logado. |
| P2 🗑️ | POST | `/catalogo/prestadores/{prestador_id}/categorias` | Rota direta para associar categorias por prestador. Preferir `/me`. |
| P2 🗑️ | PUT | `/catalogo/prestadores/{prestador_id}/categorias` | Rota direta para substituir categorias por prestador. Preferir `/me`. |
| P2 🗑️ | DELETE | `/catalogo/prestadores/{prestador_id}/categorias/{categoria_id}` | Rota direta para remover categoria por prestador. Preferir `/me`. |
| P2 ⚠️ | GET | `/catalogo/prestadores/{prestador_id}/avaliacoes` | Lista avaliacoes do prestador. |
| P2 ⚠️ | POST | `/catalogo/prestadores/{prestador_id}/avaliacoes` | Cria avaliacao. Precisa validar cliente do agendamento. |
| P2 ⚠️ | POST | `/catalogo/prestadores/{prestador_id}/servicos/{servico_id}/foto` | Upload de foto do servico. |
| P2 ⚠️ | DELETE | `/catalogo/prestadores/{prestador_id}` | Remove/inativa prestador sem apagar historico necessario. |

### Agendamentos

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 | GET | `/agendamentos/dias-disponiveis` | Usado antes de escolher data. |
| P0 | GET | `/agendamentos/disponibilidade` | Lista horarios disponiveis. |
| P0 | GET | `/agendamentos` | Lista agendamentos do usuario. Nao deve alterar status sozinho. |
| P0 | POST | `/agendamentos` | Cria agendamento. |
| P0 | PATCH | `/agendamentos/{agendamento_id}/status` | Atualiza status com regras por papel. |
| P2 | GET | `/agendamentos/{agendamento_id}` | Detalhe de agendamento. Pode ficar para depois se nao bloquear o app. |

Regras de status:

| De | Para | Quem pode |
| --- | --- | --- |
| pendente | confirmado | prestador dono ou admin |
| pendente/confirmado | cancelado | cliente dono, prestador dono ou admin |
| confirmado | concluido | prestador dono ou admin |
| pendente/confirmado | concluido automatico | job agendado apos inicio + duracao + 60 min |

Cancelamento deve manter a regra atual: agendamento em aberto, motivo obrigatorio e pelo menos 15 minutos de antecedencia.

### Notificacoes

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 | GET | `/notificacoes` | Lista notificacoes do usuario. |
| P0 | PATCH | `/notificacoes/{id}/lida` | Marca notificacao como lida. |

### Admin

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 | GET | `/admin/prestadores/pendentes` | Lista prestadores para aprovacao. |
| P0 | GET | `/admin/prestadores/{prestador_id}` | Detalhe do prestador. |
| P0 | PATCH | `/admin/prestadores/{prestador_id}/status` | Aprova/rejeita/suspende prestador. |
| P0 | GET | `/admin/categorias` | Lista categorias para admin. |
| P0 | POST | `/admin/categorias` | Cria categoria. |
| P0 | PUT | `/admin/categorias/{categoria_id}` | Edita categoria. |
| P0 | PATCH | `/admin/categorias/{categoria_id}/status` | Ativa/inativa categoria. |
| P1 | POST | `/admin/categorias/{categoria_id}/foto` | Rota correta para foto da categoria. |
| P0 | POST | `/catalogo/admin/categorias/{categoria_id}/foto` | Rota temporaria que o app usa hoje. |
| P0 | GET | `/admin/monitoramento` | Tela admin de monitoramento. |
| P0 | GET | `/admin/auditoria` | Lista auditoria. |
| P0 | GET | `/admin/auditoria/resumo` | Resumo da auditoria. |

### AI

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P0 | POST | `/ai/chat` | Mantem contrato atual do app. |
| P0 | POST | `/ai/sugestoes` | Mantem contrato atual do app. |

### Exportacoes

| Prioridade | Metodo | Rota | Observacao |
| --- | --- | --- | --- |
| P1 | POST | `/exportacoes/agendamentos` | Cria exportacao de agendamentos. |
| P1 | GET | `/exportacoes` | Lista exportacoes do usuario. |
| P1 | GET | `/exportacoes/{export_id}` | Consulta status. |
| P1 | GET | `/exportacoes/{export_id}/download` | Baixa arquivo pronto. |

Status das exportacoes:

- `em_fila`;
- `processando`;
- `concluida`;
- `falhou`;
- `expirada`.

Formatos:

- CSV: P1;
- XLSX: P1;
- PDF: P2.

### Rotas Antigas Removidas ou Substituidas

Estas rotas aparecem no sistema antigo ou no plano completo, mas nao devem ser implementadas como API publica nova.

| Origem | Metodo | Rota antiga | Destino na migracao |
| --- | --- | --- | --- |
| Auth | GET | `/auth/google/login` | Substituida por login direto no Keycloak com PKCE no app. |
| Auth | GET | `/auth/google/callback` | Substituida por redirect URI do app no fluxo PKCE. |
| Auth | GET | `/auth/internal/usuarios/{user_id}/publico` | Vira chamada interna de codigo no Core. |
| Auth | PATCH | `/auth/internal/usuarios/{user_id}/tipo` | Vira chamada interna de codigo no Core. |
| Catalogo | GET | `/catalogo/admin/prestadores/pendentes` | Substituida por `/admin/prestadores/pendentes`. |
| Catalogo | GET | `/catalogo/admin/prestadores/{prestador_id}` | Substituida por `/admin/prestadores/{prestador_id}`. |
| Catalogo | PATCH | `/catalogo/admin/prestadores/{prestador_id}/status` | Substituida por `/admin/prestadores/{prestador_id}/status`. |
| Catalogo | GET | `/catalogo/admin/categorias` | Substituida por `/admin/categorias`. |
| Catalogo | POST | `/catalogo/admin/categorias` | Substituida por `/admin/categorias`. |
| Catalogo | PUT | `/catalogo/admin/categorias/{categoria_id}` | Substituida por `/admin/categorias/{categoria_id}`. |
| Catalogo | PATCH | `/catalogo/admin/categorias/{categoria_id}/status` | Substituida por `/admin/categorias/{categoria_id}/status`. |
| Gateway | Qualquer | `/{full_path:path}` | Removida; o Spring deve expor rotas explicitas. |

## 8. O Que Nao Copiar do Sistema Antigo

| Problema | Por que corrigir |
| --- | --- |
| Rotas internas expostas, como `/auth/internal/...` | No Core novo isso deve virar chamada interna de codigo. |
| Duas formas de aprovar prestador | So a rota admin deve aprovar e promover o usuario. |
| GET `/agendamentos` concluindo agendamento automaticamente | GET nao deve alterar dados. Isso deve virar job agendado. |
| Deletar servico fisicamente | Pode quebrar agendamentos antigos que dependem daquele servico. |
| Consumer de notificacao consultando Catalogo | Evento ja deve levar os dados necessarios. |
| Auditoria pegando `usuario_id` da propria linha | Auditoria deve registrar quem fez a acao, nao apenas quem esta na tabela. |
| Portas internas 8001-8006 publicadas no Docker | Na nova arquitetura, a API publica deve ser o Core. |

## 9. Eventos Assincronos Necessarios

| Evento | Quem publica | Quem consome | Para que serve |
| --- | --- | --- | --- |
| `appointment.created` | Core scheduling | Notification Service | Criar notificacao de novo agendamento. |
| `appointment.status_changed` | Core scheduling | Notification Service | Criar notificacao quando status muda. |
| `export.requested` | Core export | Export Worker | Pedir geracao de arquivo. |
| `export.started` | Export Worker | Core export | Marcar exportacao como `processando`. |
| `export.finished` | Export Worker | Core export e Notification Service | Atualizar status da exportacao e notificar usuario. |

Eventos de agendamento devem levar dados suficientes para notificacao, sem o Notification Service consultar o Core:

- `agendamento_id`;
- `cliente_id`;
- `prestador_id`;
- `prestador_usuario_id`;
- `servico_id`;
- `inicio`;
- `nome_estab`;
- `servico_nome`;
- status anterior/novo quando for mudanca de status.

## 10. Plano de Migracao por Fases

| Fase | Objetivo | Entrega minima |
| --- | --- | --- |
| F1 | Base do projeto | Spring Boot, Docker, Keycloak, `/auth/me`, login mobile por PKCE, erro padrao. |
| F2 | Catalogo | Prestadores, categorias, servicos, horarios e uploads funcionando. |
| F3 | Agendamentos | Disponibilidade, criar agendamento e mudar status com regras. |
| F4 | Notificacoes | Eventos de agendamento gerando notificacoes. |
| F5 | Admin | Aprovar prestador, categorias admin, auditoria e monitoramento. |
| F6 | AI | Chat e sugestoes com timeout/fallback. |
| F7 | Exportacoes | CSV/XLSX de agendamentos via worker. |
| F8 | Limpeza | Remover rotas antigas/internas e finalizar compatibilidade. |

## 11. Backlog Inicial Simplificado

| ID | Fase | Tamanho | Tarefa | Depende de |
| --- | --- | --- | --- | --- |
| S-TASK-001 | F1 | M | Criar projeto Spring Boot multi-module. | nenhuma |
| S-TASK-002 | F1 | M | Criar Docker Compose com Core, Postgres, RabbitMQ, MinIO, Keycloak, Prometheus e Grafana. | S-TASK-001 |
| S-TASK-003 | F1 | M | Configurar realm Keycloak versionado com mobile PKCE, web client, Google IdP e roles. | S-TASK-002 |
| S-TASK-004 | F1 | P | Configurar Spring Security como resource server JWT. | S-TASK-003 |
| S-TASK-005 | F1 | M | Implementar `/auth/me`, `PATCH /auth/me` e id local numerico. | S-TASK-004 |
| S-TASK-006 | F1 | M | Ajustar `wonder-mobile/src/services/auth.ts` para PKCE e `/auth/me`. | S-TASK-005 |
| S-TASK-007 | F1 | P | Padronizar erros `{detail}` e configurar Swagger. | S-TASK-001 |
| S-TASK-008 | F1 | P | Salvar respostas golden do backend Python para comparar contratos. | nenhuma |
| S-TASK-009 | F2 | M | Migrar leitura de catalogo: prestadores, categorias, servicos e horarios. | S-TASK-005 |
| S-TASK-010 | F2 | M | Migrar cadastro de prestador e onboarding. | S-TASK-009 |
| S-TASK-011 | F2 | M | Migrar CRUD de servicos e horarios. | S-TASK-010 |
| S-TASK-012 | F2 | M | Migrar uploads para MinIO. | S-TASK-002 |
| S-TASK-013 | F3 | M | Migrar disponibilidade de agenda. | S-TASK-011 |
| S-TASK-014 | F3 | M | Migrar criacao e listagem de agendamentos. | S-TASK-013 |
| S-TASK-015 | F3 | M | Migrar mudanca de status de agendamento. | S-TASK-014 |
| S-TASK-016 | F4 | M | Implementar eventos RabbitMQ de agendamento. | S-TASK-015 |
| S-TASK-017 | F4 | M | Implementar Notification Service. | S-TASK-016 |
| S-TASK-018 | F5 | M | Migrar admin de prestadores. | S-TASK-010 |
| S-TASK-019 | F5 | M | Migrar admin de categorias e foto de categoria. | S-TASK-012 |
| S-TASK-020 | F5 | M | Migrar auditoria e monitoramento. | S-TASK-002 |
| S-TASK-021 | F6 | M | Migrar AI com timeout e fallback. | S-TASK-005 |
| S-TASK-022 | F7 | M | Implementar endpoints de exportacao. | S-TASK-014 |
| S-TASK-023 | F7 | M | Implementar Export Worker CSV/XLSX. | S-TASK-022 |
| S-TASK-024 | F8 | P | Remover rotas antigas e internas que nao devem ficar publicas. | S-TASK-006, S-TASK-017, S-TASK-020 |

## 12. Ordem Recomendada de Execucao

1. Subir estrutura Spring Boot, Docker e Keycloak.
2. Fazer login do app mobile funcionar com Keycloak.
3. Fazer `/auth/me` devolver o usuario local certo.
4. Migrar catalogo e onboarding.
5. Migrar agendamento.
6. Ligar RabbitMQ e notificacoes.
7. Migrar admin.
8. Fazer exportacoes.
9. Limpar rotas antigas.

## 13. Estimativa

| Escopo | Tempo aproximado |
| --- | --- |
| MVP para o app mobile | 3 a 5 semanas |
| Versao boa para o PI com Keycloak, RabbitMQ, MinIO, admin e testes | 8 a 12 semanas |
| Versao mais completa com exportacoes, observabilidade e frontend web | 12 a 16 semanas |