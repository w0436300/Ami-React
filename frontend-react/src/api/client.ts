import axios, { type AxiosInstance } from 'axios';
import { setupResponseErrorHandling } from './errors';

const rawBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL != null
    ? (import.meta.env.VITE_API_BASE_URL as string)
    : 'http://localhost:8001/';

const normalized = rawBase.replace(/\s+/g, '').replace(/\/+$/, '');

// VITE_API_BASE_URL = 后端 origin，勿带 /v1；axios baseURL = origin + '/v1/'
// 未设置时 fallback localhost:8001 — 线上构建务必注入，否则 Pages 会请求用户本机
export const apiOrigin = normalized.replace(/\/v1$/, '');
export const baseURL = (normalized.endsWith('/v1') ? normalized : `${normalized}/v1`) + '/';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Request interceptor: attach JWT */
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

setupResponseErrorHandling(apiClient);
// baseURL already exported above
