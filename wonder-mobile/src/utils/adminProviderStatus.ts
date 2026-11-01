import { AdminPrestadorStatus } from '../types/admin';

export type AdminProviderStatusAction = {
  status: AdminPrestadorStatus;
  label: string;
  variant: 'primary' | 'outline' | 'danger';
  requiresNote?: boolean;
  requiresConfirmation?: boolean;
};

const actionsByStatus: Record<AdminPrestadorStatus, AdminProviderStatusAction[]> = {
  pendente: [
    { status: 'ativo', label: 'Aprovar', variant: 'primary' },
    {
      status: 'rascunho',
      label: 'Solicitar correcao',
      variant: 'outline',
      requiresNote: true,
    },
    {
      status: 'rejeitado',
      label: 'Rejeitar',
      variant: 'danger',
      requiresNote: true,
    },
  ],
  ativo: [
    {
      status: 'suspenso',
      label: 'Suspender prestador',
      variant: 'danger',
      requiresConfirmation: true,
    },
  ],
  suspenso: [
    {
      status: 'ativo',
      label: 'Reativar prestador',
      variant: 'primary',
      requiresConfirmation: true,
    },
  ],
  rascunho: [],
  rejeitado: [],
};

export function getAdminProviderStatusActions(
  currentStatus: AdminPrestadorStatus
): AdminProviderStatusAction[] {
  return actionsByStatus[currentStatus];
}

export function getAdminProviderStatusSuccessMessage(
  previousStatus: AdminPrestadorStatus,
  nextStatus: AdminPrestadorStatus
): string {
  if (previousStatus === 'suspenso' && nextStatus === 'ativo') {
    return 'Prestador reativado com sucesso.';
  }

  if (nextStatus === 'ativo') {
    return 'Prestador aprovado com sucesso.';
  }

  if (nextStatus === 'suspenso') {
    return 'Prestador suspenso com sucesso.';
  }

  if (nextStatus === 'rejeitado') {
    return 'Cadastro rejeitado com sucesso.';
  }

  if (nextStatus === 'rascunho') {
    return 'Solicitacao de correcao enviada com sucesso.';
  }

  return 'Status atualizado com sucesso.';
}
