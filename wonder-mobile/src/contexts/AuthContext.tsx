import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { loginKeycloak, logoutKeycloak } from '../services/auth';
import { normalizeProfile } from '../services/identity';
import { getMyProfile, getProfileErrorMessage } from '../services/profileService';
import {
  clearSession, getAccessToken, getSession, getSessionVersion, isCurrentSession,
  restoreSession, saveSession, subscribeSession,
} from '../services/session';
import type { AuthState, Usuario } from '../types/auth';
import type { PerfilUsuarioResponse } from '../types/profile';

type AuthContextValue = AuthState & {
  demoModeEnabled: boolean;
  isDemoSession: boolean;
  signIn: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  retryProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_MODE_ENABLED = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const DEMO_USER: Usuario = {
  id: 'demo-client', profileId: 'demo-client', keycloakId: '', nome: 'Demonstração',
  email: 'demo@wonder.local', tipo_usuario: 'cliente', roles: [], foto_url: null, telefone: null,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawProfile = useRef<PerfilUsuarioResponse | null>(null);
  const profileRequest = useRef(0);

  async function loadProfile() {
    const expected = getSessionVersion();
    const request = ++profileRequest.current;
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const profile = await getMyProfile();
      if (!isCurrentSession(expected) || request !== profileRequest.current) return;
      const current = getSession();
      if (!current) return;
      const next = normalizeProfile(profile, current.accessToken);
      rawProfile.current = profile;
      setToken(current.accessToken);
      setUsuario(next);
    } catch (err) {
      if (!isCurrentSession(expected) || request !== profileRequest.current) return;
      rawProfile.current = null;
      setUsuario(null);
      setError(getProfileErrorMessage(err, 'Não foi possível carregar o perfil. Tente novamente.'));
    } finally {
      if (isCurrentSession(expected) && request === profileRequest.current) setLoading(false);
    }
  }

  async function signIn() {
    const expected = getSessionVersion() + 1;
    await clearSession();
    if (!isCurrentSession(expected)) return;
    setError(null);
    // O botão mantém seu próprio carregamento enquanto o navegador está aberto.
    try {
      const next = await loginKeycloak();
      if (!next || !isCurrentSession(expected)) return;
      setIsDemoSession(false);
      await saveSession(next, expected);
      await loadProfile();
    } catch (err) {
      if (isCurrentSession(expected)) {
        setError(err instanceof Error ? err.message : 'Não foi possível concluir o login.');
      }
    }
  }

  async function signInDemo() {
    if (!DEMO_MODE_ENABLED) return;
    const expected = getSessionVersion() + 1;
    await clearSession();
    if (!isCurrentSession(expected)) return;
    setIsDemoSession(true);
    setUsuario(DEMO_USER);
    setError(null);
  }

  async function signOut() {
    const previous = getSession();
    const expected = getSessionVersion() + 1;
    await clearSession();
    if (!previous || !isCurrentSession(expected)) return;
    try {
      await logoutKeycloak(previous);
    } catch {
      if (isCurrentSession(expected)) {
        const message = 'A sessão local foi encerrada, mas a sessão remota no Keycloak pode continuar ativa.';
        setError(message);
        Alert.alert('Logout', message);
      }
    }
  }

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSession((next, sessionError) => {
      if (!active) return;
      setToken(next?.accessToken ?? null);
      if (!next) {
        rawProfile.current = null;
        profileRequest.current += 1;
        setUsuario(null);
        setIsDemoSession(false);
        setLoading(false);
      } else if (sessionError) {
        rawProfile.current = null;
        setUsuario(null);
        setError(sessionError);
      } else if (rawProfile.current) {
        try {
          setUsuario(normalizeProfile(rawProfile.current, next.accessToken));
        } catch (err) {
          rawProfile.current = null;
          setUsuario(null);
          setError(err instanceof Error ? err.message : 'Perfil incompatível.');
        }
      }
    });
    const expected = getSessionVersion();
    (async () => {
      try {
        await restoreSession();
        if (active && isCurrentSession(expected)) await loadProfile();
      } catch (err) {
        if (active && isCurrentSession(expected)) {
          setError(err instanceof Error ? err.message : 'Não foi possível restaurar a sessão.');
        }
      } finally {
        if (active && isCurrentSession(expected)) setLoading(false);
      }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{
      token, usuario, loading, error, demoModeEnabled: DEMO_MODE_ENABLED,
      isDemoSession, signIn, signInDemo, signOut, retryProfile: loadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
