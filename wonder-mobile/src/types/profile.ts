export type PerfilUsuarioResponse = {
  id: string;
  keycloakId: string;
  fotoUrl: string | null;
  numeroTelefone: string | null;
};

export type UserProfile = {
  id: string;
  profileId: string;
  keycloakId: string;
  nome: string;
  email: string | null;
  telefone?: string | null;
  foto_url?: string | null;
  tipo_usuario: 'cliente' | 'prestador' | 'admin';
  roles: string[];
};

export type UserProfileUpdate = {
  nome: string;
  telefone?: string | null;
};

export type ProfilePhotoAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};
