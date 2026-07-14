export type AdminPrestadorStatus = 'rascunho' | 'pendente' | 'ativo' | 'rejeitado' | 'suspenso';
export type AdminCategoriaStatus = 'ativa' | 'inativa';

export type AdminPrestador = {
  id: number;
  usuario_id: number | string;
  nome_estab: string;
  documento: string;
  status: AdminPrestadorStatus | string;
  foto_url?: string | null;
  solicitante_nome?: string | null;
  solicitante_foto_url?: string | null;
  enviado_em?: string | null;
  aprovado_em?: string | null;
  aprovado_por?: string | null;
  motivo_rejeicao?: string | null;
};

export type AdminServico = {
  id: number;
  prestador_id: number;
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id?: number | null;
  foto_url?: string | null;
};

export type AdminHorario = {
  id: number;
  prestador_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type AdminPrestadorDetalhe = AdminPrestador & {
  servicos: AdminServico[];
  horarios: AdminHorario[];
  categorias?: Array<{
    prestador_id: number;
    categoria: AdminCategoria;
  }>;
};

export type AdminCategoria = {
  id: number;
  nome: string;
  descricao?: string | null;
  status: AdminCategoriaStatus;
  foto_url?: string | null;
};

export type AdminCategoriaPayload = {
  nome: string;
  descricao?: string | null;
};

export type AdminCategoriaStatusPayload = {
  status: AdminCategoriaStatus;
};

export type AdminStatusPayload = {
  status: AdminPrestadorStatus;
  motivo_rejeicao?: string;
};

export type AdminQueryLenta = {
  query: string;
  calls: number;
  total_exec_time: number;
  mean_exec_time: number;
  rows: number;
};

export type AdminConexaoAtiva = {
  pid: number;
  usuario?: string | null;
  aplicacao?: string | null;
  cliente?: string | null;
  estado?: string | null;
  wait_event_type?: string | null;
  duracao_segundos?: number | null;
  query?: string | null;
};

export type AdminDeadTuple = {
  schema_name: string;
  tabela: string;
  live_tuples: number;
  dead_tuples: number;
  last_vacuum?: string | null;
  last_autovacuum?: string | null;
};

export type AdminMonitoramentoBanco = {
  banco: string;
  queries_lentas: AdminQueryLenta[];
  conexoes_ativas: AdminConexaoAtiva[];
  tabelas_dead_tuples: AdminDeadTuple[];
  erro?: string | null;
};

export type AdminLogAuditoria = {
  id: string;
  banco: string;
  usuario_id?: number | null;
  operacao: string;
  tabela_afetada: string;
  dados_antigos?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  data_hora: string;
};

export type AdminResumoAuditoria = {
  banco: string;
  operacao: string;
  total: number;
};
