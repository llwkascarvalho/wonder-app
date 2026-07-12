import { api } from './api';

export async function enviarMensagemChat(mensagem: string): Promise<string> {
  const response = await api.post<{ resposta: string }>('/ai/chat', { mensagem });
  return response.data.resposta;
}

export async function buscarSugestoesIA(): Promise<string[]> {
  const response = await api.post<{ sugestoes: string[] }>('/ai/sugestoes');
  return response.data.sugestoes;
}
