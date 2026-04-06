import axios from 'axios';

// ─── Get API Base URL from Environment Variables ──────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('[API Config] Using API URL:', API_URL);

// ─── Create Axios Instance ──────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// ─── Request Interceptor (Add Auth Token) ───────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor (Handle Errors) ───────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // Log error response
    if (error.response?.status === 401) {
      // Unauthorized - token expired or invalid
      console.warn('[API] Unauthorized - clearing auth state');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
    
    console.error('[API Response Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
