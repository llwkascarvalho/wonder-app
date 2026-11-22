import { api } from './api';
import { Notificacao, NotificacaoStatus, NotificacoesPagina } from '../types/notificacao';

export async function listarNotificacoes(status?: NotificacaoStatus): Promise<Notificacao[]> {
  const response = await api.get<Notificacao[]>('/notificacoes', {
    params: status ? { status } : undefined,
  });
  return response.data;
}

export async function marcarNotificacaoComoLida(notificacaoId: number): Promise<Notificacao> {
  const response = await api.patch<Notificacao>(`/notificacoes/${notificacaoId}/lida`);
  return response.data;
}

export async function marcarTodasNotificacoesComoLidas(): Promise<void> {
  await api.patch('/notificacoes/lidas');
}

export async function listarNotificacoesPagina(
  pagina: number, limite = 20, status?: NotificacaoStatus,
): Promise<NotificacoesPagina> {
  const response = await api.get<NotificacoesPagina>('/notificacoes/pagina', {
    params: { pagina, limite, ...(status ? { status } : {}) },
  });
  return response.data;
}
