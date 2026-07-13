import { AxiosError } from 'axios';

import { api } from './api';
import {
  ProviderCategoryLink,
  ProviderOnboardingCategory,
  ProviderOnboardingProfile,
  ProviderOnboardingProfilePayload,
  ProviderOnboardingSchedule,
  ProviderOnboardingSchedulePayload,
  ProviderOnboardingService,
  ProviderOnboardingServicePayload,
} from '../types/providerOnboarding';

export function isNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

export function getBackendMessage(error: unknown, fallback: string): string {
  const data = error instanceof AxiosError ? error.response?.data : null;

  function parse(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(parse).filter(Boolean).join('\n') || null;
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return parse(objectValue.detail) || parse(objectValue.erros) || parse(objectValue.message);
    }

    return null;
  }

  return parse(data) || fallback;
}

export async function obterMeuPrestador(): Promise<ProviderOnboardingProfile | null> {
  try {
    const response = await api.get<ProviderOnboardingProfile>('/catalogo/prestadores/me');
    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function criarPerfilPrestador(
  payload: ProviderOnboardingProfilePayload
): Promise<ProviderOnboardingProfile> {
  const response = await api.post<ProviderOnboardingProfile>('/catalogo/prestadores', payload);
  return response.data;
}

export async function atualizarPerfilPrestador(
  prestadorId: number,
  payload: Partial<ProviderOnboardingProfilePayload>
): Promise<ProviderOnboardingProfile> {
  const response = await api.put<ProviderOnboardingProfile>(`/catalogo/prestadores/${prestadorId}`, payload);
  return response.data;
}

export async function listarCategoriasAtivas(): Promise<ProviderOnboardingCategory[]> {
  const response = await api.get<ProviderOnboardingCategory[]>('/catalogo/categorias');
  return response.data;
}

export async function listarMinhasCategoriasPrestador(): Promise<ProviderCategoryLink[]> {
  const response = await api.get<ProviderCategoryLink[]>('/catalogo/prestadores/me/categorias');
  return response.data;
}

export async function listarMinhasCategoriasPrestadorSeguro(): Promise<ProviderCategoryLink[]> {
  try {
    return await listarMinhasCategoriasPrestador();
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

export async function associarMinhasCategoriasPrestador(categoriaIds: number[]): Promise<ProviderCategoryLink[]> {
  const response = await api.post<ProviderCategoryLink[]>('/catalogo/prestadores/me/categorias', {
    categoria_ids: categoriaIds,
  });
  return response.data;
}

export async function removerMinhaCategoriaPrestador(categoriaId: number): Promise<void> {
  await api.delete(`/catalogo/prestadores/me/categorias/${categoriaId}`);
}

export async function listarServicosPrestadorOnboarding(prestadorId: number): Promise<ProviderOnboardingService[]> {
  const response = await api.get<ProviderOnboardingService[]>(`/catalogo/prestadores/${prestadorId}/servicos`);
  return response.data;
}

export async function listarServicosPrestadorOnboardingSeguro(
  prestadorId: number
): Promise<ProviderOnboardingService[]> {
  try {
    return await listarServicosPrestadorOnboarding(prestadorId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

export async function criarServicoPrestadorOnboarding(
  prestadorId: number,
  payload: ProviderOnboardingServicePayload
): Promise<ProviderOnboardingService> {
  const response = await api.post<ProviderOnboardingService>(
    `/catalogo/prestadores/${prestadorId}/servicos`,
    payload
  );
  return response.data;
}

export async function listarHorariosPrestadorOnboarding(prestadorId: number): Promise<ProviderOnboardingSchedule[]> {
  const response = await api.get<ProviderOnboardingSchedule[]>(`/catalogo/prestadores/${prestadorId}/horarios`);
  return response.data;
}

export async function listarHorariosPrestadorOnboardingSeguro(
  prestadorId: number
): Promise<ProviderOnboardingSchedule[]> {
  try {
    return await listarHorariosPrestadorOnboarding(prestadorId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

export async function criarHorarioPrestadorOnboarding(
  prestadorId: number,
  payload: ProviderOnboardingSchedulePayload
): Promise<ProviderOnboardingSchedule> {
  const response = await api.post<ProviderOnboardingSchedule>(
    `/catalogo/prestadores/${prestadorId}/horarios`,
    payload
  );
  return response.data;
}

export async function removerHorarioPrestadorOnboarding(prestadorId: number, horarioId: number): Promise<void> {
  await api.delete(`/catalogo/prestadores/${prestadorId}/horarios/${horarioId}`);
}

export async function enviarPrestadorParaAprovacao(prestadorId: number): Promise<ProviderOnboardingProfile> {
  const response = await api.post<ProviderOnboardingProfile>(
    `/catalogo/prestadores/${prestadorId}/enviar-aprovacao`
  );
  return response.data;
}
