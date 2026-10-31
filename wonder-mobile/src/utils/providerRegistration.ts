import { ProviderOnboardingProfilePayload, ProviderRegistrationDraft } from '../types/providerOnboarding';

export const registrationFields = {
  nomeEstab: { label: 'Nome do estabelecimento', maxLength: 255 },
  documento: { label: 'CPF/CNPJ (opcional)', maxLength: 20 },
  endereco: { label: 'Endereço', maxLength: 255 },
  numero: { label: 'Número', maxLength: 30 },
  bairro: { label: 'Bairro', maxLength: 120 },
  cidade: { label: 'Cidade', maxLength: 120 },
  estado: { label: 'UF', maxLength: 2 },
  complemento: { label: 'Complemento', maxLength: 255 },
} satisfies Record<keyof ProviderRegistrationDraft, { label: string; maxLength: number }>;

export const emptyProviderDraft: ProviderRegistrationDraft = {
  nomeEstab: '', documento: '', endereco: '', numero: '', bairro: '', cidade: '',
  estado: '', complemento: '',
};

export function validateProviderRegistration(draft: ProviderRegistrationDraft) {
  const errors: Partial<Record<keyof ProviderRegistrationDraft, string>> = {};
  if (!draft.nomeEstab.trim()) errors.nomeEstab = 'Informe o nome do estabelecimento.';
  for (const key of Object.keys(registrationFields) as Array<keyof ProviderRegistrationDraft>) {
    const field = registrationFields[key];
    if (draft[key].trim().length > field.maxLength) errors[key] = `${field.label}: use até ${field.maxLength} caracteres.`;
  }
  return errors;
}

export function buildProviderRegistrationPayload(draft: ProviderRegistrationDraft): ProviderOnboardingProfilePayload {
  return {
    nomeEstab: draft.nomeEstab.trim(),
    documento: draft.documento.trim() || null,
    endereco: draft.endereco.trim() || null,
    numero: draft.numero.trim() || null,
    bairro: draft.bairro.trim() || null,
    cidade: draft.cidade.trim() || null,
    estado: draft.estado.trim().toUpperCase() || null,
    complemento: draft.complemento.trim() || null,
  };
}
