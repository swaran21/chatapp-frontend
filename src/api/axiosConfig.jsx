// src/api/axiosConfig.js
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import hook conditionally or handle navigation differently

const apiClient = axios.create({
  baseURL: 'http://localhost:8080', // Your Spring Boot backend URL
  withCredentials: true, // Crucial for sending session cookies!
});

// Optional: Add interceptors for handling 401/403 errors globally
apiClient.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    if (error.response) {
        const { status } = error.response;
        // Handle Unauthorized or Forbidden errors
        if (status === 401 || status === 403) {
            console.error(`API Error (${status}):`, error.response.data?.message || 'Access Denied');
            // Redirect to login page
            // IMPORTANT: You can't use hooks directly here.
            // Option 1: Use window.location (simple, causes full page reload)
            // window.location.href = '/login?sessionExpired=true';

            // Option 2: Emit a custom event that a top-level component listens for
            // const event = new CustomEvent('auth-error');
            // window.dispatchEvent(event);

            // Option 3: If using a state manager (Redux, Zustand), dispatch an action
        }
    } else {
        // Network errors, etc.
        console.error("Network or other error:", error.message);
    }
    // Reject the promise so individual .catch() blocks can still handle specific errors if needed
    return Promise.reject(error);
  }
);

export default apiClient;