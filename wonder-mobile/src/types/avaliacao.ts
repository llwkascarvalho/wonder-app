export type Avaliacao = {
  id: number;
  agendamento_id: number;
  prestador_id: number;
  nota: number;
};

export type CadastroAvaliacao = {
  agendamento_id: number;
  nota: number;
};
