import { AxiosError } from 'axios';

import { api } from './api';
import { ProfilePhotoAsset } from '../types/profile';
import { appendImageFile, appendProfilePhoto } from './profileService';
import { adaptarPrestadorProprio, PrestadorProprioApiResponse } from './providerAdapter';
import {
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
    const response = await api.get<PrestadorProprioApiResponse>('/catalogo/prestadores/me');
    return adaptarPrestadorProprio(response.data);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function criarPerfilPrestador(
  payload: ProviderOnboardingProfilePayload,
  arquivo?: ProfilePhotoAsset
): Promise<ProviderOnboardingProfile> {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value != null) form.append(key, value);
  }
  if (arquivo) appendProfilePhoto(form, arquivo);
  const response = await api.post<PrestadorProprioApiResponse>('/catalogo/prestadores', form);
  return adaptarPrestadorProprio(response.data);
}

export async function atualizarPerfilPrestador(
  prestadorId: number,
  payload: Partial<ProviderOnboardingProfilePayload>
): Promise<ProviderOnboardingProfile> {
  const response = await api.put<PrestadorProprioApiResponse>(`/catalogo/prestadores/${prestadorId}`, payload);
  return adaptarPrestadorProprio(response.data);
}

export async function uploadFotoPrestadorOnboarding(
  prestadorId: number,
  asset: ProfilePhotoAsset
): Promise<ProviderOnboardingProfile> {
  const formData = new FormData();
  appendImageFile(formData, 'file', asset, `prestador-${prestadorId}`);

  const response = await api.post<PrestadorProprioApiResponse>(
    `/catalogo/prestadores/${prestadorId}/foto`,
    formData
  );

  return adaptarPrestadorProprio(response.data);
}

export async function listarCategoriasAtivas(): Promise<ProviderOnboardingCategory[]> {
  const response = await api.get<ProviderOnboardingCategory[]>('/catalogo/categorias');
  return response.data;
}

export async function listarMinhasCategoriasPrestador(): Promise<ProviderOnboardingCategory[]> {
  const response = await api.get<ProviderOnboardingCategory[]>('/catalogo/prestadores/me/categorias');
  return response.data;
}

export async function listarMinhasCategoriasPrestadorSeguro(): Promise<ProviderOnboardingCategory[]> {
  try {
    return await listarMinhasCategoriasPrestador();
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

export async function listarMeusServicosPrestador(): Promise<ProviderOnboardingService[]> {
  const response = await api.get<ProviderOnboardingService[]>('/catalogo/prestadores/me/servicos');
  return response.data;
}

export async function criarServicoPrestadorOnboarding(
  prestadorId: number,
  payload: ProviderOnboardingServicePayload
): Promise<ProviderOnboardingService> {
  const response = await api.post<ProviderOnboardingService>(`/catalogo/prestadores/${prestadorId}/servicos`, payload);
  return response.data;
}

export async function atualizarServicoPrestadorOnboarding(
  prestadorId: number,
  servicoId: number,
  payload: ProviderOnboardingServicePayload
): Promise<ProviderOnboardingService> {
  const response = await api.put<ProviderOnboardingService>(
    `/catalogo/prestadores/${prestadorId}/servicos/${servicoId}`,
    payload
  );
  return response.data;
}

export async function removerServicoPrestadorOnboarding(prestadorId: number, servicoId: number): Promise<void> {
  await api.delete(`/catalogo/prestadores/${prestadorId}/servicos/${servicoId}`);
}

export async function listarMeusHorariosPrestador(): Promise<ProviderOnboardingSchedule[]> {
  const response = await api.get<ProviderOnboardingSchedule[]>('/catalogo/prestadores/me/horarios');
  return response.data;
}

export async function criarHorarioPrestadorOnboarding(
  prestadorId: number,
  payload: ProviderOnboardingSchedulePayload
): Promise<ProviderOnboardingSchedule> {
  const response = await api.post<ProviderOnboardingSchedule>(`/catalogo/prestadores/${prestadorId}/horarios`, payload);
  return response.data;
}

export async function removerHorarioPrestadorOnboarding(prestadorId: number, horarioId: number): Promise<void> {
  await api.delete(`/catalogo/prestadores/${prestadorId}/horarios/${horarioId}`);
}

export async function enviarPrestadorParaAprovacao(prestadorId: number): Promise<ProviderOnboardingProfile> {
  const response = await api.post<PrestadorProprioApiResponse>(
    `/catalogo/prestadores/${prestadorId}/enviar-aprovacao`
  );
  return adaptarPrestadorProprio(response.data);
}
