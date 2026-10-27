import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { SessionTokens } from '../types/auth';
import { refreshKeycloak } from './auth';

const STORAGE_KEY = 'keycloak-session';
let tokens: SessionTokens | null = null;
let version = 0;
let refreshing: Promise<string> | null = null;
let storageWrite: Promise<void> = Promise.resolve();
const listeners = new Set<(tokens: SessionTokens | null, error?: string) => void>();

export const getSession = () => tokens;
export const getSessionVersion = () => version;
export const isCurrentSession = (expected: number) => expected === version;

export function subscribeSession(listener: (tokens: SessionTokens | null, error?: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(error?: string) {
  listeners.forEach((listener) => listener(tokens, error));
}

// Serializa apenas escritas no SecureStore: uma gravação já iniciada deve
// terminar antes da remoção no logout ou da gravação do próximo login.
function writeStorage(value: SessionTokens | null, expected: number) {
  const write = storageWrite.catch(() => {}).then(async () => {
    if (!isCurrentSession(expected) || Platform.OS === 'web') return;
    if (value) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(STORAGE_KEY);
  });
  storageWrite = write;
  return write;
}

export async function saveSession(value: SessionTokens, expected: number) {
  if (!isCurrentSession(expected)) throw new Error('Sessão encerrada.');
  await writeStorage(value, expected);
  if (!isCurrentSession(expected)) throw new Error('Sessão encerrada.');
  tokens = value;
  publish();
}

export async function clearSession() {
  version += 1;
  tokens = null;
  refreshing = null;
  publish();
  await writeStorage(null, version);
}

export async function restoreSession() {
  const expected = version;
  if (Platform.OS === 'web') {
    // Sessão web somente em memória; descarta o JWT legado sem persistir tokens.
    globalThis.localStorage?.removeItem('jwt');
    return;
  }
  await storageWrite.catch(() => {});
  await SecureStore.deleteItemAsync('jwt');
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!isCurrentSession(expected) || !stored) return;
  try {
    const value: SessionTokens = JSON.parse(stored);
    if (!value || typeof value.accessToken !== 'string' || !value.accessToken ||
        !Number.isFinite(value.expiresAt) ||
        !(value.refreshToken === null || typeof value.refreshToken === 'string') ||
        !(value.idToken === null || typeof value.idToken === 'string')) {
      throw new Error('Sessão armazenada inválida.');
    }
    tokens = value;
    publish();
  } catch {
    await clearSession();
  }
}

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (refreshing) return refreshing;
  if (!tokens) return null;
  if (!forceRefresh && tokens.expiresAt > Date.now() + 30000) return tokens.accessToken;
  if (!tokens.refreshToken) {
    await clearSession();
    throw new Error('Sessão expirada. Entre novamente.');
  }
  const expected = version;
  const previous = tokens;
  const operation = (async () => {
    try {
      const next = await refreshKeycloak(previous);
      await saveSession(next, expected);
      return next.accessToken;
    } catch (error) {
      if (!isCurrentSession(expected)) throw new Error('Sessão encerrada.');
      const code = (error as { code?: string })?.code;
      if (code === 'invalid_grant' || code === 'invalid_client' || code === 'unauthorized_client') {
        await clearSession();
        throw new Error('Sessão expirada. Entre novamente.');
      }
      const message = 'Não foi possível renovar a sessão. Verifique a conexão e tente novamente.';
      publish(message);
      throw new Error(message);
    }
  })();
  refreshing = operation;
  try {
    return await operation;
  } finally {
    if (refreshing === operation) refreshing = null;
  }
}
