import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { registerUnauthorizedHandler } from '../services/api';
import {
  clearToken,
  getStoredToken,
  getUsuarioFromToken,
  isTokenValid,
  loginWithGoogle,
} from '../services/auth';
import { AuthState } from '../types/auth';

type AuthContextValue = AuthState & {
  demoModeEnabled: boolean;
  isDemoSession: boolean;
  signInWithGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_MODE_ENABLED = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const DEMO_USER = {
  id: 'demo-client',
  email: 'demo@wonder.local',
  tipo_usuario: 'cliente',
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [loading, setLoading] = useState(true);

  const usuario = token ? getUsuarioFromToken(token) : isDemoSession ? DEMO_USER : null;

  async function restoreToken() {
    setLoading(true);

    try {
      if (DEMO_MODE_ENABLED) {
        await clearToken();
        setToken(null);
        return;
      }

      const storedToken = await getStoredToken();

      if (storedToken && !isTokenValid(storedToken)) {
        await clearToken();
        setToken(null);
        return;
      }

      setToken(storedToken);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const newToken = await loginWithGoogle();
    setIsDemoSession(false);
    setToken(newToken);
  }

  async function signInDemo() {
    await clearToken();
    setToken(null);
    setIsDemoSession(true);
  }

  async function signOut() {
    await clearToken();
    setToken(null);
    setIsDemoSession(false);
  }

  useEffect(() => {
    restoreToken();
  }, []);

  // Sempre que a API responder 401 (token expirado/inválido), encerra a
  // sessão automaticamente — a troca de `token` para null já faz o
  // AppNavigator voltar para a tela de Login sozinho.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setToken(null);
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      usuario,
      loading,
      demoModeEnabled: DEMO_MODE_ENABLED,
      isDemoSession,
      signInWithGoogle,
      signInDemo,
      signOut,
      restoreToken,
    }),
    [token, usuario, loading, isDemoSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
