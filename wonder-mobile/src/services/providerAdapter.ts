import { Prestador, PrestadorPayload } from '../types/provider';

export type PrestadorApiResponse = Omit<Prestador, 'usuario_id' | 'nome_estab' | 'foto_url'> & {
  perfilUsuarioId: string;
  nomeEstab: string;
  fotoUrl: string | null;
};

export function adaptarPrestador(prestador: PrestadorApiResponse): Prestador {
  const { perfilUsuarioId, nomeEstab, fotoUrl, ...dados } = prestador;
  return { ...dados, usuario_id: perfilUsuarioId, nome_estab: nomeEstab, foto_url: fotoUrl };
}

export function adaptarPayloadPrestador(payload: Partial<PrestadorPayload>) {
  const { nome_estab, ...dados } = payload;
  return { ...dados, ...(nome_estab !== undefined ? { nomeEstab: nome_estab } : {}) };
}
