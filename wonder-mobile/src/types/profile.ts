export type UserProfile = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  foto_url?: string | null;
  tipo_usuario: string;
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
