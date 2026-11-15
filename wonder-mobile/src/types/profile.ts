export type PerfilUsuarioResponse = {
  id: string;
  keycloakId: string;
  fotoUrl: string | null;
  numeroTelefone: string | null;
  identidade?: IdentidadeUsuario;
};

export type IdentidadeUsuario = {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  email: string | null;
};

export type UserProfile = {
  id: string;
  profileId: string;
  keycloakId: string;
  nome: string;
  primeiroNome?: string;
  sobrenome?: string;
  email: string | null;
  telefone?: string | null;
  foto_url?: string | null;
  tipo_usuario: 'cliente' | 'prestador' | 'admin';
  roles: string[];
};

export type UserProfileUpdate = {
  identidade?: { nome: string; sobrenome: string; email: string };
  telefone?: string;
  foto?: ProfilePhotoAsset;
};

export type ProfilePhotoAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  file?: File;
};
