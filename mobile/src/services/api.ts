import axios from 'axios';
import { ENV } from '../config/env';
import { getToken } from './secureStorage';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
