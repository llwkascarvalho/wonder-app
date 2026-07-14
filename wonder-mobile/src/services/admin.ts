import { api } from './api';
import { ProfilePhotoAsset } from '../types/profile';
import {
  AdminCategoria,
  AdminCategoriaPayload,
  AdminCategoriaStatusPayload,
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
  const fileName = asset.fileName || `categoria-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  formData.append('file', {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await api.post<AdminCategoria>(
    `/catalogo/admin/categorias/${categoriaId}/foto`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
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
