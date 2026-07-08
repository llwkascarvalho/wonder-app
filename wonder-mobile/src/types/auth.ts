export type Usuario = {
  id: string;
  email?: string;
  tipo_usuario?: 'cliente' | 'prestador' | 'admin' | string;
};

export type AuthState = {
  token: string | null;
  usuario: Usuario | null;
  loading: boolean;
};

export type DecodedJwtPayload = {
  sub?: string | number;
  id?: string | number;
  email?: string;
  tipo_usuario?: string;
  exp?: number;
};
