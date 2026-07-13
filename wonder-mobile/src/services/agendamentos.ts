import { api } from './api';
import {
  Agendamento,
  AgendamentoCreate,
  AgendamentoStatusUpdate,
  DiasDisponiveisResponse,
  DisponibilidadeResponse,
} from '../types/agendamento';

export async function listarAgendamentos(): Promise<Agendamento[]> {
  const response = await api.get<Agendamento[]>('/agendamentos');
  return response.data;
}

export async function criarAgendamento(dados: AgendamentoCreate): Promise<Agendamento> {
  const response = await api.post<Agendamento>('/agendamentos', dados);
  return response.data;
}

export async function listarDiasDisponiveis(params: {
  prestador_id: number;
  servico_id: number;
  mes: string;
}): Promise<DiasDisponiveisResponse> {
  const response = await api.get<DiasDisponiveisResponse>('/agendamentos/dias-disponiveis', {
    params,
  });
  return response.data;
}

export async function listarDisponibilidade(params: {
  prestador_id: number;
  servico_id: number;
  data: string;
}): Promise<DisponibilidadeResponse> {
  const response = await api.get<DisponibilidadeResponse>('/agendamentos/disponibilidade', {
    params,
  });
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
  const possivelDetail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;

  if (typeof possivelDetail === 'string') {
    return possivelDetail;
  }

  return fallback;
}
