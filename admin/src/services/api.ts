import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = sessionStorage.getItem('admin_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: nextRefresh } = res.data.data;
          sessionStorage.setItem('admin_access_token', accessToken);
          sessionStorage.setItem('admin_refresh_token', nextRefresh);
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return adminApi(error.config);
        } catch {
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
