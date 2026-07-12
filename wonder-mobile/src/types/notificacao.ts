export type NotificacaoStatus = 'pendente' | 'lida' | string;

export type Notificacao = {
  id: number;
  usuario_id: number;
  mensagem: string;
  status: NotificacaoStatus;
  criado_em: string;
};
