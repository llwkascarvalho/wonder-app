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
- O servico de agendamentos tambem publica evento ao cancelar agendamentos.
- O consumer do servico de notificacao escuta `wonder.eventos` em background.
- Atualmente o consumer cria notificacoes somente para o `cliente_id` recebido no evento.

## Fora de escopo desta branch

Notificacoes para prestador nao foram implementadas nesta branch. Para isso, e necessaria uma issue separada de eventos/RabbitMQ definindo:

- quais eventos devem notificar o prestador;
- qual mensagem cada evento deve gerar;
- quais usuarios recebem cada notificacao;
- como tratar notificacoes para cliente e prestador no mesmo evento.
