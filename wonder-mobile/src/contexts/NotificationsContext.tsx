import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

import { listarNotificacoes } from '../services/notificacoes';

type NotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Intervalo de atualização automática do contador (não depende do usuário
// abrir a tela de notificações para o badge da aba ficar em dia).
const POLL_INTERVAL_MS = 30000;

export function NotificationsProvider({ children }: PropsWithChildren) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const pendentes = await listarNotificacoes('pendente');
      setUnreadCount(pendentes.length);
    } catch {
      // Falha silenciosa: o badge simplesmente não atualiza nesta tentativa.
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }

  return context;
}
