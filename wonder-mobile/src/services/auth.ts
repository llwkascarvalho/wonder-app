import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { DecodedJwtPayload, Usuario } from '../types/auth';

const TOKEN_KEY = 'jwt';
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
const loginPath = process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH || '/auth/google/login';

function getAuthRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    path: 'auth',
  });
}

WebBrowser.maybeCompleteAuthSession();

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
  }

  throw new Error('Decodificador base64 indisponível.');
}

export function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload)) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

export function getUsuarioFromToken(token: string): Usuario | null {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return null;
  }

  const id = payload.sub ?? payload.id;

  if (!id) {
    return null;
  }

  return {
    id: String(id),
    email: payload.email,
    tipo_usuario: payload.tipo_usuario,
  };
}

export function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    return false;
  }

  return Boolean(payload.sub ?? payload.id);
}

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function extractTokenFromUrl(url: string): string | null {
  const [, queryString = ''] = url.split('?');
  const [, hashString = ''] = url.split('#');
  const params = new URLSearchParams(queryString || hashString);

  return params.get('access_token') || params.get('token');
}

export async function loginWithGoogle(): Promise<string> {
  const redirectUri = getAuthRedirectUri();
  const params = new URLSearchParams({
    mobile: 'true',
    redirect_uri: redirectUri,
  });
  const loginUrl = `${baseURL}${loginPath}?${params.toString()}`;
  const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

  if (result.type !== 'success') {
    throw new Error('Login cancelado ou não concluído.');
  }

  const token = extractTokenFromUrl(result.url);

  if (!token) {
    throw new Error(
      'Login concluído, mas o token não foi retornado para o app. Verifique o redirect OAuth do backend.'
    );
  }

  if (!isTokenValid(token)) {
    throw new Error('Token retornado pelo login é inválido.');
  }

  await saveToken(token);
  return token;
}
