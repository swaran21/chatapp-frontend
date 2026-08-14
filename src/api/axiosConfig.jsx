import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
});

let csrfToken;
let csrfBootstrapRequest;

const loadCsrfToken = async () => {
  csrfBootstrapRequest ??= apiClient.get('/api/auth/csrf-token')
    .then(({ data }) => {
      if (!data?.token) throw new Error('The backend did not return a CSRF token.');
      csrfToken = data.token;
      return csrfToken;
    });
  try {
    return await csrfBootstrapRequest;
  } finally {
    csrfBootstrapRequest = undefined;
  }
};

const ensureCsrfToken = () => csrfToken ? Promise.resolve(csrfToken) : loadCsrfToken();
apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-TOKEN'] = await ensureCsrfToken();
  }
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && originalRequest && !originalRequest._csrfRetried) {
      originalRequest._csrfRetried = true;
      try {
        csrfToken = undefined;
        originalRequest.headers['X-CSRF-TOKEN'] = await loadCsrfToken();
        return apiClient.request(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }
    if (error.response) {
      const { status } = error.response;
      if (status === 401 || status === 403) {
        console.error(`API Error (${status}):`, error.response.data?.message || 'Access denied');
      }
    } else {
      console.error("Network or other error:", error.message);
    }
    return Promise.reject(error);
  }
);
export default apiClient;
