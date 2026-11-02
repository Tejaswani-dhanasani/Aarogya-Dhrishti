import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
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