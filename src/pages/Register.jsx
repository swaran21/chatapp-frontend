import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig"; // Use apiClient

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false); // Differentiate success/error message styling

  const handleRegister = async () => {
    setMessage(""); // Clear previous message
    setIsError(false);
     if (!username || !password) {
        setMessage("Please enter username and password.");
        setIsError(true);
        return;
    }
    try {
      const response = await apiClient.post( // Use apiClient, relative URL
          "/api/auth/register",
          { username, password }
      );
      setMessage(response.data.message || "Registration successful!"); // Use backend message
      setIsError(false);
      setTimeout(() => navigate("/login"), 1500); // Redirect to login after delay
    } catch (error) {
      setIsError(true);
      if (error.response) {
         // Use specific error message from backend if available (e.g., 409 Conflict)
        setMessage(error.response.data?.message || `Registration failed (Status: ${error.response.status})`);
      } else {
        setMessage("Registration failed. Please check network or try again.");
      }
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200">
      <h2 className="text-2xl mb-4">Register</h2>
       {message && (
            <p className={`mb-3 ${isError ? 'text-red-500' : 'text-green-600'}`}>
                {message}
            </p>
        )}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="p-2 mb-2 border rounded w-64"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 mb-4 border rounded w-64"
      />
      <button onClick={handleRegister} className="bg-green-500 text-white p-2 rounded w-64 hover:bg-green-600">
        Register
      </button>
       {/* Link to Login */}
       <p className="mt-4">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">
                Login here
            </button>
        </p>
    </div>
  );
};

export default Register;