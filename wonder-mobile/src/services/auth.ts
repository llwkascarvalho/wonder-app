import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import type { SessionTokens } from '../types/auth';
import { decodeJwtPayload } from './identity';

WebBrowser.maybeCompleteAuthSession();

function getConfig() {
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER?.replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
  if (!issuer || !clientId) {
    throw new Error('Configure EXPO_PUBLIC_KEYCLOAK_ISSUER e EXPO_PUBLIC_KEYCLOAK_CLIENT_ID.');
  }
  return { issuer, clientId };
}

export function getAuthRedirectUri() {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI ||
    AuthSession.makeRedirectUri({ scheme: 'wonder', path: 'auth' });
}

function tokensFromResponse(response: AuthSession.TokenResponse, previous?: SessionTokens): SessionTokens {
  const claims = decodeJwtPayload(response.accessToken);
  const expiresAt = response.expiresIn !== undefined
    ? ((response.issuedAt ?? Date.now() / 1000) + response.expiresIn) * 1000
    : (claims?.exp ?? 0) * 1000;
  if (!claims?.sub || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('O Keycloak retornou um access token inválido.');
  }
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? previous?.refreshToken ?? null,
    idToken: response.idToken ?? previous?.idToken ?? null,
    expiresAt,
  };
}

export async function loginKeycloak(): Promise<SessionTokens | null> {
  const { issuer, clientId } = getConfig();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);
  const redirectUri = getAuthRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId, redirectUri, scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true, codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });
  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success' || !result.params.code || !request.codeVerifier) {
    throw new Error('Não foi possível concluir o login no Keycloak.');
  }
  const response = await AuthSession.exchangeCodeAsync({
    clientId, redirectUri, code: result.params.code,
    extraParams: { code_verifier: request.codeVerifier },
  }, discovery);
  return tokensFromResponse(response);
}

export async function refreshKeycloak(tokens: SessionTokens): Promise<SessionTokens> {
  const { issuer, clientId } = getConfig();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);
  const response = await AuthSession.refreshAsync({ clientId, refreshToken: tokens.refreshToken! }, discovery);
  return tokensFromResponse(response, tokens);
}

export async function logoutKeycloak(tokens: SessionTokens): Promise<void> {
  const { issuer, clientId } = getConfig();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);
  if (!discovery.endSessionEndpoint) throw new Error('Logout OIDC indisponível.');
  const redirectUri = getAuthRedirectUri();
  const params = new URLSearchParams({ client_id: clientId, post_logout_redirect_uri: redirectUri });
  if (tokens.idToken) params.set('id_token_hint', tokens.idToken);
  const result = await WebBrowser.openAuthSessionAsync(`${discovery.endSessionEndpoint}?${params}`, redirectUri);
  if (result.type !== 'success' || result.url.split(/[?#]/)[0] !== redirectUri.split(/[?#]/)[0]) {
    throw new Error('Logout remoto não confirmado.');
  }
}
