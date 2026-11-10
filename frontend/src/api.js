import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  const method = config?.method?.toLowerCase();
  const safeToRetry = ['get', 'head'].includes(method)
    || Boolean(config?.headers?.['Idempotency-Key']);
  const retryable = !error.response
    || error.response.status === 408
    || error.response.status === 429
    || error.response.status >= 500;

  if (!config || !safeToRetry || !retryable || (config.__retryCount || 0) >= 2) {
    return Promise.reject(error);
  }

  config.__retryCount = (config.__retryCount || 0) + 1;
  await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** config.__retryCount)));
  return api.request(config);
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ad_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const errMsg = (e) =>
  e.response?.data?.error ||
  "Cannot reach the server. Is the backend running?";

export default api;