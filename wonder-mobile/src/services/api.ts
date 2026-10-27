import axios, { InternalAxiosRequestConfig } from 'axios';

import { clearSession, getAccessToken, getSession, getSessionVersion, isCurrentSession } from './session';

type SessionRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _sessionVersion?: number;
  _accessToken?: string | null;
};

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080',
  timeout: 10000,
});

api.interceptors.request.use(async (config: SessionRequest) => {
  const expected = config._sessionVersion ?? getSessionVersion();
  if (!isCurrentSession(expected)) throw new Error('Sessão encerrada.');
  const token = await getAccessToken();
  if (!isCurrentSession(expected)) throw new Error('Sessão encerrada.');
  config._sessionVersion = expected;
  config._accessToken = token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else config.headers.delete('Authorization');
  return config;
});

api.interceptors.response.use(
  (response) => {
    const config = response.config as SessionRequest;
    if (config._sessionVersion !== undefined && !isCurrentSession(config._sessionVersion)) {
      throw new Error('Sessão encerrada.');
    }
    return response;
  },
  async (error) => {
    const config = error?.config as SessionRequest | undefined;
    if (!config || config._sessionVersion === undefined) return Promise.reject(error);
    if (!isCurrentSession(config._sessionVersion)) throw new Error('Sessão encerrada.');
    if (error?.response?.status !== 401 || !config._accessToken) return Promise.reject(error);
    if (config._retry) {
      await clearSession();
      return Promise.reject(error);
    }
    config._retry = true;
    // Outro pedido pode ter renovado o token enquanto este aguardava o 401.
    const current = getSession()?.accessToken;
    const token = current && current !== config._accessToken
      ? await getAccessToken() : await getAccessToken(true);
    if (!token || !isCurrentSession(config._sessionVersion)) throw new Error('Sessão encerrada.');
    return api.request(config);
  }
);

export default api;
