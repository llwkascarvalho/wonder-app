import { api } from './api';
import { Agendamento, AgendamentoCreate, AgendamentoStatusUpdate } from '../types/agendamento';

export async function listarAgendamentos(): Promise<Agendamento[]> {
  const response = await api.get<Agendamento[]>('/agendamentos');
  return response.data;
}

export async function criarAgendamento(dados: AgendamentoCreate): Promise<Agendamento> {
  const response = await api.post<Agendamento>('/agendamentos', dados);
  return response.data;
}

export async function atualizarStatusAgendamento(
  agendamentoId: number,
  dados: AgendamentoStatusUpdate
): Promise<Agendamento> {
  const response = await api.patch<Agendamento>(`/agendamentos/${agendamentoId}/status`, dados);
  return response.data;
}

/**
 * Extrai uma mensagem de erro amigável de uma resposta de erro do Axios,
 * priorizando o campo `detail` retornado pela API (padrão FastAPI).
 */
export function extrairMensagemErro(error: unknown, fallback: string): string {
  const possivelDetail = (error as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
  return possivelDetail || fallback;
}
