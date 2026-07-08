import api from './api';
import {
  Agendamento,
  Horario,
  HorarioPayload,
  Prestador,
  PrestadorPayload,
  Servico,
  ServicoPayload,
} from '../types/provider';

export async function listarPrestadores() {
  const response = await api.get<Prestador[]>('/catalogo/prestadores');
  return response.data;
}

export async function obterPrestadorLogado(usuarioId: string | number) {
  const prestadores = await listarPrestadores();
  return prestadores.find((prestador) => String(prestador.usuario_id) === String(usuarioId)) || null;
}

export async function criarPrestador(payload: PrestadorPayload) {
  const response = await api.post<Prestador>('/catalogo/prestadores', payload);
  return response.data;
}

export async function atualizarPrestador(prestadorId: number, payload: Partial<PrestadorPayload>) {
  const response = await api.put<Prestador>(`/catalogo/prestadores/${prestadorId}`, payload);
  return response.data;
}

export async function listarServicos(prestadorId: number) {
  const response = await api.get<Servico[]>(`/catalogo/prestadores/${prestadorId}/servicos`);
  return response.data;
}

export async function criarServico(prestadorId: number, payload: ServicoPayload) {
  const response = await api.post<Servico>(`/catalogo/prestadores/${prestadorId}/servicos`, payload);
  return response.data;
}

export async function listarHorarios(prestadorId: number) {
  const response = await api.get<Horario[]>(`/catalogo/prestadores/${prestadorId}/horarios`);
  return response.data;
}

export async function criarHorario(prestadorId: number, payload: HorarioPayload) {
  const response = await api.post<Horario>(`/catalogo/prestadores/${prestadorId}/horarios`, payload);
  return response.data;
}

export async function removerHorario(prestadorId: number, horarioId: number) {
  await api.delete(`/catalogo/prestadores/${prestadorId}/horarios/${horarioId}`);
}

export async function listarAgendamentos() {
  const response = await api.get<Agendamento[]>('/agendamentos');
  return response.data;
}

export async function atualizarStatusAgendamento(agendamentoId: number, status: string, motivo?: string) {
  const response = await api.patch<Agendamento>(`/agendamentos/${agendamentoId}/status`, {
    status,
    motivo,
  });
  return response.data;
}
