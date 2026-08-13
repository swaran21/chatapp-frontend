import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
});

const readCookie = (name) => document.cookie
  .split('; ')
  .find((row) => row.startsWith(`${name}=`))
  ?.split('=')[1];

apiClient.interceptors.request.use((config) => {
  const csrfToken = readCookie('XSRF-TOKEN');
  if (csrfToken && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-TOKEN'] = decodeURIComponent(csrfToken);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response) {
        const { status } = error.response;
        // Handle Unauthorized or Forbidden errors
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
