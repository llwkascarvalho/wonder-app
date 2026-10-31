export type Categoria = {
  id: number;
  nome: string;
  descricao?: string | null;
  status?: string;
  foto_url?: string | null;
};

export type Prestador = {
  id: number;
  usuario_id: number | string;
  nome_estab: string;
  documento: string;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  complemento?: string | null;
  status: string;
  foto_url?: string | null;
};

export type Servico = {
  id: number;
  prestador_id: number;
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id?: number | null;
  foto_url?: string | null;
};

export type Horario = {
  id: number;
  prestador_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export const DIAS_SEMANA = [
  'Dia invalido',
  'Segunda-feira',
  'Terca-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sabado',
  'Domingo',
] as const;

export type FotoEstabelecimento = {
  id: number;
  prestador_id: number;
  foto_url: string;
  ordem: number;
};
