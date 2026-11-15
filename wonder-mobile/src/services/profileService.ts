import { Platform } from 'react-native';
import api from './api';
import type { IdentidadeUsuario, PerfilUsuarioResponse, ProfilePhotoAsset, UserProfileUpdate } from '../types/profile';

export function getProfileErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 'Sua conta não tem permissão para acessar o perfil.';
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 400) return 'Verifique os dados informados. A foto deve ser JPEG, PNG ou WebP.';
  if (status === 409) return 'Este e-mail já está em uso. Escolha outro e tente novamente.';
  if (status === 413) return 'A foto deve ter até 5 MiB e o envio completo até 6 MiB.';
  if (status === 415) return 'Não foi possível enviar o formulário do perfil. Tente novamente.';
  if (status === 503) return 'Não foi possível concluir a operação agora. Confira os dados antes de tentar novamente.';
  return error instanceof Error && !status ? error.message : fallback;
}

export function validateProfilePhoto(asset: ProfilePhotoAsset): void {
  const mime = Platform.OS === 'web' ? asset.file?.type : asset.mimeType;
  const size = Platform.OS === 'web' ? asset.file?.size : asset.fileSize;
  if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    throw new Error('Selecione outra foto com formato JPEG, PNG ou WebP identificado.');
  }
  if (size === undefined || !Number.isFinite(size) || size <= 0) {
    throw new Error('Não foi possível verificar o tamanho da foto. Selecione outro arquivo.');
  }
  if (size > 5242880) throw new Error('A foto deve ter até 5 MiB.');
}

export function appendProfilePhoto(form: FormData, asset: ProfilePhotoAsset): void {
  appendImageFile(form, 'arquivo', asset, 'perfil');
}

export function appendImageFile(
  form: FormData,
  fieldName: string,
  asset: ProfilePhotoAsset,
  fallbackName: string
): void {
  validateProfilePhoto(asset);
  if (Platform.OS === 'web') {
    form.append(fieldName, asset.file!, asset.file!.name);
  } else {
    const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/png' ? 'png' : 'webp';
    form.append(fieldName, {
      uri: asset.uri, name: asset.fileName || `${fallbackName}.${extension}`, type: asset.mimeType,
    } as unknown as Blob);
  }
}

export async function updateMyProfile(
  payload: UserProfileUpdate, checkSession: () => void = () => {},
): Promise<PerfilUsuarioResponse> {
  if (payload.telefone && payload.telefone.length > 20) {
    throw new Error('O telefone deve ter até 20 caracteres.');
  }
  const form = new FormData();
  if (payload.telefone?.trim()) form.append('numeroTelefone', payload.telefone);
  if (payload.foto) {
    appendProfilePhoto(form, payload.foto);
  }
  const identidade = payload.identidade && {
    nome: payload.identidade.nome.trim(), sobrenome: payload.identidade.sobrenome.trim(), email: payload.identidade.email.trim(),
  };
  if (identidade && (!identidade.nome || identidade.nome.length > 255 || identidade.sobrenome.length > 255 ||
      identidade.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identidade.email))) {
    throw new Error('Informe um nome e um e-mail válidos.');
  }
  const perfilChanged = Boolean(payload.telefone?.trim() || payload.foto);
  if (!identidade && !perfilChanged) throw new Error('Nenhuma alteração para salvar.');
  let identidadeSalva = false;
  try {
    checkSession();
    if (identidade) {
      await api.put('/perfis/eu/identidade', identidade);
      identidadeSalva = true;
    }
    checkSession();
    if (perfilChanged) await api.put('/perfis/eu', form);
    checkSession();
    const perfil = await getMyProfile();
    checkSession();
    return perfil;
  } catch (error) {
    if (identidadeSalva) {
      throw new Error('Nome e e-mail foram salvos, mas não foi possível concluir a atualização do perfil. Confira os dados antes de tentar novamente.');
    }
    throw error;
  }
}

export async function getProfilePhoto(fotoUrl: string): Promise<string> {
  const response = await api.get<Blob>(fotoUrl, {
    responseType: 'blob', headers: { 'Cache-Control': 'no-cache' },
  });
  if (Platform.OS === 'web') return URL.createObjectURL(response.data);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.readAsDataURL(response.data);
  });
}

export function resolveProfilePhotoUrl(fotoUrl?: string | null): string | undefined {
  return fotoUrl || undefined;
}

export async function getMyProfile(): Promise<PerfilUsuarioResponse> {
  const [perfil, identidade] = await Promise.all([
    api.get<PerfilUsuarioResponse>('/perfis/eu'), api.get<IdentidadeUsuario>('/perfis/eu/identidade'),
  ]);
  return { ...perfil.data, identidade: identidade.data };
}
