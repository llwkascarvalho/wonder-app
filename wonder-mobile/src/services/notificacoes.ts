import { api } from './api';
import { Notificacao, NotificacaoStatus } from '../types/notificacao';

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
