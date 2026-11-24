import { api } from './api';
import { ProfilePhotoAsset } from '../types/profile';
import { appendImageFile } from './profileService';
import {
  AdminCategoria,
  AdminCategoriaPayload,
  AdminCategoriaStatusPayload,
  AdminDashboardAgendamentos,
  AdminDashboardIndicadores,
  AdminExportacaoSolicitada,
  AdminLogAuditoria,
  AdminMonitoramentoBanco,
  AdminPrestador,
  AdminPrestadorDetalhe,
  AdminPrestadoresPagina,
  AdminResumoAuditoria,
  AdminStatusPayload,
  AdminUsuario,
  AdminUsuariosPagina,
  AdminUsuarioPayload,
} from '../types/admin';

export async function listarUsuariosAdmin(busca = '', inicio = 0, papel?: string): Promise<AdminUsuariosPagina> {
  const response = await api.get<AdminUsuariosPagina>('/admin/usuarios', {
    params: { busca, inicio, limite: 20, ...(papel ? { papel } : {}) },
  });
  return response.data;
}

export async function listarPrestadoresAdmin(params: {
  busca?: string; status?: string; data_inicio?: string; data_fim?: string; inicio?: number;
}): Promise<AdminPrestadoresPagina> {
  const response = await api.get<AdminPrestadoresPagina>('/admin/prestadores', {
    params: { ...params, limite: 20 },
  });
  return response.data;
}

export async function obterIndicadoresAdmin(): Promise<AdminDashboardIndicadores> {
  const response = await api.get<AdminDashboardIndicadores>('/admin/dashboard/indicadores');
  return response.data;
}

export async function obterAgendamentosAdmin(data_inicio: string, data_fim: string): Promise<AdminDashboardAgendamentos> {
  const response = await api.get<AdminDashboardAgendamentos>('/admin/dashboard/agendamentos', {
    params: { data_inicio, data_fim },
  });
  return response.data;
}

export async function solicitarExportacaoAdmin(
  tipo: 'usuarios' | 'prestadores' | 'agendamentos',
  params: Record<string, string | undefined>
): Promise<AdminExportacaoSolicitada> {
  const path = tipo === 'agendamentos' ? '/admin/dashboard/agendamentos/exportacoes' : `/admin/${tipo}/exportacoes`;
  const response = await api.post<AdminExportacaoSolicitada>(path, null, { params });
  return response.data;
}

export function mensagemErroExportacaoAdmin(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: string; message?: string } } })?.response;
  const detalhe = response?.data?.detail || response?.data?.message || '';
  if (response?.status === 400 && detalhe.includes('e-mail cadastrado')) {
    return 'Esta conta não tem e-mail cadastrado no Keycloak. Atualize o perfil e tente novamente.';
  }
  if (response?.status === 401) return 'Sua sessão expirou. Entre novamente para solicitar a exportação.';
  if (response?.status === 403) return 'Sua conta não tem permissão para solicitar esta exportação.';
  if (response?.status === 503) return 'O serviço de exportação está indisponível. Tente novamente em instantes.';
  return 'Não foi possível solicitar a exportação. Tente novamente ou confira o serviço.';
}

export async function obterUsuarioAdmin(id: string): Promise<AdminUsuario> {
  const response = await api.get<AdminUsuario>(`/admin/usuarios/${encodeURIComponent(id)}`);
  return response.data;
}

export async function atualizarUsuarioAdmin(id: string, payload: AdminUsuarioPayload): Promise<AdminUsuario> {
  const response = await api.put<AdminUsuario>(`/admin/usuarios/${encodeURIComponent(id)}`, payload);
  return response.data;
}

export async function atualizarStatusUsuarioAdmin(id: string, ativo: boolean): Promise<AdminUsuario> {
  const response = await api.patch<AdminUsuario>(`/admin/usuarios/${encodeURIComponent(id)}/status`, { ativo });
  return response.data;
}

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
): Promise<AdminPrestadorDetalhe> {
  const response = await api.patch<AdminPrestadorDetalhe>(
    `/admin/prestadores/${prestadorId}/status`,
    payload
  );
  return response.data;
}

export async function listarCategoriasAdmin(): Promise<AdminCategoria[]> {
  const response = await api.get<AdminCategoria[]>('/admin/categorias');
  return response.data;
}

export async function criarCategoriaAdmin(payload: AdminCategoriaPayload): Promise<AdminCategoria> {
  const response = await api.post<AdminCategoria>('/admin/categorias', payload);
  return response.data;
}

export async function atualizarCategoriaAdmin(
  categoriaId: number,
  payload: AdminCategoriaPayload
): Promise<AdminCategoria> {
  const response = await api.put<AdminCategoria>(`/admin/categorias/${categoriaId}`, payload);
  return response.data;
}

export async function atualizarStatusCategoriaAdmin(
  categoriaId: number,
  payload: AdminCategoriaStatusPayload
): Promise<AdminCategoria> {
  const response = await api.patch<AdminCategoria>(`/admin/categorias/${categoriaId}/status`, payload);
  return response.data;
}

export async function uploadFotoCategoriaAdmin(
  categoriaId: number,
  asset: ProfilePhotoAsset
): Promise<AdminCategoria> {
  const formData = new FormData();
  appendImageFile(formData, 'file', asset, `categoria-${categoriaId}`);

  const response = await api.post<AdminCategoria>(
    `/admin/categorias/${categoriaId}/foto`,
    formData
  );

  return response.data;
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
