import axios from 'axios';

import { clearToken, getStoredToken } from './auth';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handler opcional, registrado pelo AuthProvider, chamado sempre que a API
// retornar 401 — permite encerrar a sessão e voltar para a tela de Login
// automaticamente, sem cada tela precisar tratar isso individualmente.
let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export default api;
