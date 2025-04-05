import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import hook conditionally or handle navigation differently

const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response) {
        const { status } = error.response;
        // Handle Unauthorized or Forbidden errors
        if (status === 401 || status === 403) {
            console.error(`API Error (${status}):`, error.response.data?.message || 'Access Denied');
        }
    } else {
        console.error("Network or other error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;