# Wonder App

[![CI](https://github.com/llwkascarvalho/wonder-app/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/llwkascarvalho/wonder-app/actions)
[![Wiki](https://img.shields.io/badge/docs-wiki-blue)](https://github.com/llwkascarvalho/wonder-app/wiki)

Plataforma de agendamento de serviços de beleza, construída como um ecossistema de microsserviços distribuídos.

## 1. Descrição do Sistema

O **Wonder** é uma aplicação que conecta clientes e prestadores de serviços de beleza. Prestadores disponibilizam seus serviços em uma vitrine digital, definindo preços e horários; clientes buscam profissionais por categoria e localização e agendam diretamente pelo sistema, eliminando a burocracia do processo tradicional.

O projeto nasceu como estudo de caso da disciplina de Sistemas Distribuídos, evoluindo de uma arquitetura monolítica para um ecossistema de microsserviços desacoplados, comunicando-se de forma síncrona (REST) e assíncrona (mensageria).

**Principais funcionalidades:**
- Cadastro e autenticação de clientes e prestadores via Google OAuth2;
- Busca e filtro de prestadores e serviços por nome e categoria;
- Agendamento com controle de conflito de horário;
- Notificações assíncronas de confirmação e cancelamento de agendamento;
- Assistente de IA (LLM) para auxiliar o cliente na escolha de serviços;
- Auditoria automática de todas as operações de escrita no banco de dados;
- Painel administrativo com relatórios de auditoria e monitoramento de banco.

## 2. Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Python 3 + FastAPI |
| Frontend Mobile | React Native + Expo |
| Banco de Dados | PostgreSQL 16 (um banco isolado por serviço) |
| Mensageria | RabbitMQ 3 |
| Containerização | Docker e Docker Compose |
| IA / LLM | OpenRouter (API do Google Gemini) |
| Autenticação | Google OAuth2 |
| CI/CD | GitHub Actions |

## 3. Arquitetura

O sistema segue uma arquitetura de microsserviços, com um API Gateway centralizando o roteamento das requisições. Cada serviço possui seu próprio banco PostgreSQL, garantindo isolamento e transparência de localização. O diagrama C4 (Contexto e Container) está disponível na [Wiki do projeto](https://github.com/llwkascarvalho/wonder-app/wiki).

**Serviços e portas:**

| Serviço | Porta |
|---|---|
| Gateway | 8000 |
| Auth (Autenticação) | 8001 |
| Catálogo | 8002 |
| Agendamentos | 8003 |
| Notificação | 8004 |
| AI (Assistente) | 8005 |

Além dos serviços de negócio, o ambiente conta com containers de apoio para **backup automático** (`pg_dump` agendado via cron) e **admin/monitoramento** (relatórios unificados de auditoria e métricas via `pg_stat_statements`).

## 4. Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)
- Chaves de API necessárias:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `OPENROUTER_API_KEY`

## 5. Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/llwkascarvalho/wonder-app.git
cd wonder-app

# 2. Copiar o arquivo de variáveis de ambiente e preenchê-lo
cp .env.example .env
# Edite o .env e preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e OPENROUTER_API_KEY

# 3. Subir o ambiente completo
docker compose up --build
```

Após a subida dos containers, o Gateway estará disponível em `http://localhost:8000` e o healthcheck pode ser validado em `GET /health`.

## 6. Documentação

- **Wiki do projeto:** visão geral, escopo, diagramas de arquitetura, contrato de endpoints e seção de auditoria/monitoramento/backup — [acesse aqui](https://github.com/llwkascarvalho/wonder-app/wiki).
- **Swagger UI:** cada serviço expõe sua documentação automática em `/docs` (ex: `http://localhost:8002/docs` para o Catálogo).
- **Relatório do Processo de Software:** [`docs/RELATORIO_PROCESSO.md`](docs/RELATORIO_PROCESSO.md).

## 7. Equipe

- João Roque Pereira Neto
- Lwkas Lwhan Gonçalves Carvalho

Projeto desenvolvido para o Instituto Federal do Rio Grande do Norte — Campus Pau dos Ferros, Tecnologia em ADS.
