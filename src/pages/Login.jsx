// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../api/axiosConfig";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

   const from = location.state?.from?.pathname || "/welcome"; // Default to /welcome

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await apiClient.get("/api/auth/session");
        if (response.data.loggedIn) {
          navigate(from, { replace: true });
        }
      } catch (error) {
        if (error.response?.status !== 401) {
            console.error("Session check failed on login page:", error);
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (event) => {
     event.preventDefault();
    setError("");
    if (!username || !password) {
        setError("Please enter username and password.");
        return;
    }
    setLoading(true);

    try {
      const response = await apiClient.post(
        "/api/auth/login",
        { username, password }
      );

      if (response.status === 200 && response.data.message === "User logged in successfully!") {
        navigate(from, { replace: true });
      } else {
        setError(response.data.message || "Login failed. Unexpected response.");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError("Invalid username or password!");
      } else {
        setError("Login failed. Please check network or try again later.");
        console.error("Login error:", error);
      }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-xs p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
        <form onSubmit={handleLogin}>
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                    Username
                </label>
                <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    required 
                    disabled={loading}
                />
            </div>
            <div className="mb-6">
                 <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    required
                    disabled={loading}
                />
            </div>
            <div className="flex items-center justify-between">
                <button
                    type="submit" 
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </div>
        </form>
         <p className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')} className="text-blue-600 hover:underline focus:outline-none">
                Register here
            </button>
        </p>
      </div>
    </div>
  );
};

export default Login;