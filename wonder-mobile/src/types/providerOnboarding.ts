export type ProviderOnboardingStatus = 'rascunho' | 'pendente' | 'ativo' | 'rejeitado' | 'suspenso';

export type ProviderOnboardingProfile = {
  id: number;
  usuario_id: string | number;
  nome_estab: string;
  documento: string;
  status: ProviderOnboardingStatus | string;
  foto_url?: string | null;
  enviado_em?: string | null;
  aprovado_em?: string | null;
  aprovado_por?: string | null;
  motivo_rejeicao?: string | null;
};

export type ProviderOnboardingProfilePayload = {
  nome_estab: string;
  documento: string;
};

export type ProviderOnboardingCategory = {
  id: number;
  nome: string;
  descricao?: string | null;
  status?: string;
};

export type ProviderCategoryLink = {
  prestador_id: number;
  categoria: ProviderOnboardingCategory;
};

export type ProviderOnboardingService = {
  id: number;
  prestador_id: number;
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id?: number | null;
};

export type ProviderOnboardingServicePayload = {
  nome: string;
  preco: number;
  duracao_min: number;
  categoria_id: number;
};

export type ProviderOnboardingSchedule = {
  id: number;
  prestador_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type ProviderOnboardingSchedulePayload = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};
