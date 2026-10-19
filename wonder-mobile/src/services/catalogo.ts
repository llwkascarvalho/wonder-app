import { api } from './api';
import { Categoria, Horario, Prestador, Servico } from '../types/catalogo';

type PrestadorApiResponse = Omit<Prestador, 'usuario_id' | 'nome_estab' | 'foto_url'> & {
  perfilUsuarioId: string;
  nomeEstab: string;
  fotoUrl: string | null;
};

function adaptarPrestador(prestador: PrestadorApiResponse): Prestador {
  const { perfilUsuarioId, nomeEstab, fotoUrl, ...dados } = prestador;

  return {
    ...dados,
    usuario_id: perfilUsuarioId,
    nome_estab: nomeEstab,
    foto_url: fotoUrl,
  };
}

export async function listarPrestadores(params?: {
  nome?: string;
  categoria_id?: number;
}): Promise<Prestador[]> {
  const response = await api.get<PrestadorApiResponse[]>('/catalogo/prestadores', { params });
  return response.data.map(adaptarPrestador);
}

export async function listarCategorias(): Promise<Categoria[]> {
  const response = await api.get<Categoria[]>('/catalogo/categorias');
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

export async function listarHorariosPrestador(prestadorId: number): Promise<Horario[]> {
  const response = await api.get<Horario[]>(`/catalogo/prestadores/${prestadorId}/horarios`);
  return response.data;
}

export async function listarCategoriasPrestador(prestadorId: number): Promise<Categoria[]> {
  const response = await api.get<Categoria[]>(
    `/catalogo/prestadores/${prestadorId}/categorias`
  );
  return response.data;
}
