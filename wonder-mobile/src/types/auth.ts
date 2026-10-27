import type { UserProfile } from './profile';

export type Usuario = UserProfile;
export type AuthState = {
  token: string | null;
  usuario: Usuario | null;
  loading: boolean;
  error: string | null;
};
export type SessionTokens = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number;
};
export type DecodedJwtPayload = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string | null;
  realm_access?: { roles?: string[] };
  exp?: number;
};
