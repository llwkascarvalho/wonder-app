export type Prestador = {
  id: number;
  usuario_id: string | number;
  nome_estab: string;
  documento: string;
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

export type Agendamento = {
  id: number;
  cliente_id: number;
  prestador_id: number;
  servico_id: number;
  inicio: string;
  status: string;
  cliente_nome?: string | null;
  cliente_foto_url?: string | null;
};

export type PrestadorPayload = {
  nome_estab: string;
  documento: string;
};

export type ServicoPayload = {
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id?: number;
};

export type HorarioPayload = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};
