import api from './api';
import { ProfilePhotoAsset, UserProfile, UserProfileUpdate } from '../types/profile';

export function getProfileErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (typeof data === 'object' && data !== null && 'detail' in data) {
      const detail = (data as { detail?: unknown }).detail;

      if (typeof detail === 'string') {
        return detail;
      }
    }
  }

  return fallback;
}

export function resolveProfilePhotoUrl(fotoUrl?: string | null): string | undefined {
  if (!fotoUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(fotoUrl)) {
    return fotoUrl;
  }

  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const normalizedPath = fotoUrl.startsWith('/') ? fotoUrl : `/${fotoUrl}`;

  return `${baseURL}${normalizedPath}`;
}

export async function getMyProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/auth/me');
  return response.data;
}

export async function updateMyProfile(payload: UserProfileUpdate): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/auth/me', payload);
  return response.data;
}

export async function uploadMyProfilePhoto(asset: ProfilePhotoAsset): Promise<UserProfile> {
  const formData = new FormData();
  const fileName = asset.fileName || `profile-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  formData.append('file', {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await api.post<UserProfile>('/auth/me/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
