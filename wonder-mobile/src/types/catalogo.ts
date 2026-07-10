export type Categoria = {
  id: number;
  nome: string;
};

export type Prestador = {
  id: number;
  usuario_id: number | string;
  nome_estab: string;
  documento: string;
  status: string;
};

export type Servico = {
  id: number;
  prestador_id: number;
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id?: number | null;
};

export type Horario = {
  id: number;
  prestador_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type Avaliacao = {
  id: number;
  agendamento_id: number;
  prestador_id: number;
  nota: number;
};

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;
