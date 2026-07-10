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
