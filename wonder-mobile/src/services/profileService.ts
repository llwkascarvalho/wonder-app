import api from './api';
import type { PerfilUsuarioResponse } from '../types/profile';

export function getProfileErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 'Sua conta não tem permissão para acessar o perfil.';
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  return error instanceof Error && !status ? error.message : fallback;
}

export function resolveProfilePhotoUrl(fotoUrl?: string | null): string | undefined {
  return fotoUrl || undefined;
}

export async function getMyProfile(): Promise<PerfilUsuarioResponse> {
  const response = await api.get<PerfilUsuarioResponse>('/perfis/eu');
  return response.data;
}
