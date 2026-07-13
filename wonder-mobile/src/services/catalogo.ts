import { api } from './api';
import { Avaliacao, Categoria, Horario, Prestador, Servico } from '../types/catalogo';

type PrestadorCategoriaResponse = {
  prestador_id: number;
  categoria: Categoria;
};

export async function listarPrestadores(params?: {
  nome?: string;
  categoria_id?: number;
}): Promise<Prestador[]> {
  const response = await api.get<Prestador[]>('/catalogo/prestadores', { params });
  return response.data;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const response = await api.get<Categoria[]>('/catalogo/categorias');
  return response.data;
}

export async function obterPrestador(prestadorId: number): Promise<Prestador> {
  const response = await api.get<Prestador>(`/catalogo/prestadores/${prestadorId}`);
  return response.data;
}

export async function listarServicosPrestador(prestadorId: number): Promise<Servico[]> {
  const response = await api.get<Servico[]>(`/catalogo/prestadores/${prestadorId}/servicos`);
  return response.data;
}

export async function listarHorariosPrestador(prestadorId: number): Promise<Horario[]> {
  const response = await api.get<Horario[]>(`/catalogo/prestadores/${prestadorId}/horarios`);
  return response.data;
}

export async function listarCategoriasPrestador(prestadorId: number): Promise<Categoria[]> {
  const response = await api.get<PrestadorCategoriaResponse[]>(
    `/catalogo/prestadores/${prestadorId}/categorias`
  );
  return response.data.map((item) => item.categoria);
}

export async function listarAvaliacoesPrestador(prestadorId: number): Promise<Avaliacao[]> {
  const response = await api.get<Avaliacao[]>(`/catalogo/prestadores/${prestadorId}/avaliacoes`);
  return response.data;
}
