import { api } from './api';
import { listarCategorias } from './catalogo';
import {
  AdminCategoria,
  AdminLogAuditoria,
  AdminMonitoramentoBanco,
  AdminPrestador,
  AdminPrestadorDetalhe,
  AdminResumoAuditoria,
  AdminStatusPayload,
} from '../types/admin';

export async function listarPrestadoresPendentes(): Promise<AdminPrestador[]> {
  const response = await api.get<AdminPrestador[]>('/admin/prestadores/pendentes');
  return response.data;
}

export async function obterPrestadorAdmin(prestadorId: number): Promise<AdminPrestadorDetalhe> {
  const response = await api.get<AdminPrestadorDetalhe>(`/admin/prestadores/${prestadorId}`);
  return response.data;
}

export async function atualizarStatusPrestadorAdmin(
  prestadorId: number,
  payload: AdminStatusPayload
): Promise<AdminPrestador> {
  const response = await api.patch<AdminPrestador>(`/admin/prestadores/${prestadorId}/status`, payload);
  return response.data;
}

export async function listarCategoriasAdmin(): Promise<AdminCategoria[]> {
  return listarCategorias();
}

export async function obterMonitoramentoAdmin(limit = 10): Promise<AdminMonitoramentoBanco[]> {
  const response = await api.get<AdminMonitoramentoBanco[]>('/admin/monitoramento', {
    params: { limit },
  });
  return response.data;
}

export async function listarAuditoriaAdmin(limit = 50): Promise<AdminLogAuditoria[]> {
  const response = await api.get<AdminLogAuditoria[]>('/admin/auditoria', {
    params: { limit },
  });
  return response.data;
}

export async function obterResumoAuditoriaAdmin(): Promise<AdminResumoAuditoria[]> {
  const response = await api.get<AdminResumoAuditoria[]>('/admin/auditoria/resumo');
  return response.data;
}
