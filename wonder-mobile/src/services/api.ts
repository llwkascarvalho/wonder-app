import axios from 'axios';

import { getStoredToken } from './auth';

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

export default api;
