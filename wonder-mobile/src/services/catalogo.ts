import { api } from './api';
import { Categoria, Horario, Prestador, Servico } from '../types/catalogo';
import { adaptarPrestador, PrestadorApiResponse } from './providerAdapter';

export async function listarPrestadores(params?: {
  nome?: string;
  categoria_id?: number;
}, signal?: AbortSignal): Promise<Prestador[]> {
  const response = await api.get<PrestadorApiResponse[]>('/catalogo/prestadores', { params, signal });
  return response.data.map(adaptarPrestador);
}

export async function listarCategorias(signal?: AbortSignal): Promise<Categoria[]> {
  const response = await api.get<Categoria[]>('/catalogo/categorias', { signal });
  return response.data;
}

export async function obterPrestador(prestadorId: number): Promise<Prestador> {
  const response = await api.get<PrestadorApiResponse>(`/catalogo/prestadores/${prestadorId}`);
  return adaptarPrestador(response.data);
}

export async function listarServicosPrestador(prestadorId: number): Promise<Servico[]> {
  const response = await api.get<Servico[]>(`/catalogo/prestadores/${prestadorId}/servicos`);
  return response.data;
}

export async function listarHorariosPrestador(prestadorId: number, signal?: AbortSignal): Promise<Horario[]> {
  const response = await api.get<Horario[]>(`/catalogo/prestadores/${prestadorId}/horarios`, { signal });
  return response.data;
}

export async function listarCategoriasPrestador(prestadorId: number, signal?: AbortSignal): Promise<Categoria[]> {
  const response = await api.get<Categoria[]>(
    `/catalogo/prestadores/${prestadorId}/categorias`, { signal }
  );
  return response.data;
}
