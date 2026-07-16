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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const usuario = token ? getUsuarioFromToken(token) : null;

  async function restoreToken() {
    setLoading(true);

    try {
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
    setToken(newToken);
  }

  async function signOut() {
    await clearToken();
    setToken(null);
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
      signInWithGoogle,
      signOut,
      restoreToken,
    }),
    [token, usuario, loading]
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
