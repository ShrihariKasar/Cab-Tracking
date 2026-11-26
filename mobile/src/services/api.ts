import axios from 'axios';
import { ENV } from '../config/env';
import { getServerUrl, getToken } from './secureStorage';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const [token, customOrigin] = await Promise.all([getToken(), getServerUrl()]);
  if (customOrigin) {
    config.baseURL = `${customOrigin}/api`;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
