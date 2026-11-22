export type NotificacaoStatus = 'pendente' | 'lida' | string;

export type Notificacao = {
  id: number;
  usuario_id: string;
  mensagem: string;
  status: NotificacaoStatus;
  criado_em: string;
};

export type NotificacoesPagina = {
  itens: Notificacao[];
  pagina: number;
  limite: number;
  total: number;
  temProxima: boolean;
};
