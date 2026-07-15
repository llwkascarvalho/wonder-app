# Auditoria de Notificacoes

## Estado atual

- A tela `NotificationsScreen` ja existe no app e e exibida na aba `Avisos`.
- O frontend chama `GET /notificacoes` pelo `api.ts`, portanto envia o JWT pelo Gateway.
- O frontend chama `PATCH /notificacoes/{id}/lida` para marcar notificacoes como lidas.
- O `NotificationsContext` consulta notificacoes pendentes para atualizar o badge da aba.
- O backend de notificacoes possui `GET /notificacoes` e `PATCH /notificacoes/{id}/lida`.
- O Gateway possui alias para rotear `notificacoes` para o servico `notificacao`.

## Eventos existentes

- O servico de agendamentos publica eventos na fila `wonder.eventos` ao criar agendamentos.
- O servico de agendamentos tambem publica evento ao atualizar status de agendamentos.
- O consumer do servico de notificacao escuta `wonder.eventos` em background.
- O consumer cria notificacoes para cliente e prestador conforme o evento. Para o prestador, resolve `prestador_id -> usuario_id` consultando o Catalogo.

## Destinatarios atuais

- Novo agendamento: cliente e prestador.
- Cancelamento pelo cliente: cliente e prestador.
- Cancelamento pelo prestador: cliente.
- Confirmacao/conclusao: cliente.
