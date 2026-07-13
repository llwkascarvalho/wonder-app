export type AgendamentoStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | string;

export type Agendamento = {
  id: number;
  cliente_id: number;
  prestador_id: number;
  servico_id: number;
  inicio: string;
  status: AgendamentoStatus;
};

export type AgendamentoCreate = {
  prestador_id: number;
  servico_id: number;
  inicio: string;
};

export type AgendamentoStatusUpdate = {
  status: AgendamentoStatus;
  motivo?: string;
};

export type HorarioDisponivel = {
  inicio: string;
  fim: string;
};

export type DisponibilidadeResponse = {
  prestador_id: number;
  servico_id: number;
  data: string;
  duracao_min: number;
  horarios: HorarioDisponivel[];
};

export type DiaDisponivel = {
  data: string;
  disponivel: boolean;
};

export type DiasDisponiveisResponse = {
  prestador_id: number;
  servico_id: number;
  mes: string;
  dias: DiaDisponivel[];
};
