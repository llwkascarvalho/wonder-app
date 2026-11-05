import { api } from './api';
import { Avaliacao, CadastroAvaliacao } from '../types/avaliacao';

export async function listarAvaliacoesPrestador(prestadorId: number): Promise<Avaliacao[]> {
  const response = await api.get<Avaliacao[]>(
    `/catalogo/prestadores/${prestadorId}/avaliacoes`
  );
  return response.data;
}

export async function criarAvaliacaoPrestador(
  prestadorId: number,
  dados: CadastroAvaliacao
): Promise<Avaliacao> {
  const response = await api.post<Avaliacao>(
    `/catalogo/prestadores/${prestadorId}/avaliacoes`,
    dados
  );
  return response.data;
}
