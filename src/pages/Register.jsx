import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async () => {
    setMessage("");
    setIsError(false);
    if (!username || !password) {
      setMessage("Please enter username and password.");
      setIsError(true);
      return;
    }
    try {
      const response = await apiClient.post("/api/auth/register", {
        username,
        password,
      });
      setMessage(response.data.message || "Registration successful!");
      setIsError(false);
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setIsError(true);
      if (error.response) {
        setMessage(
          error.response.data?.message ||
            `Registration failed (Status: ${error.response.status})`
        );
      } else {
        setMessage("Registration failed. Please check network or try again.");
      }
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-indigo-900 px-4 py-8">
      {/* Enhanced Card */}
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
          Register
        </h2>

        {message && (
          <p
            className={`text-center mb-4 text-sm p-2 rounded-md border ${
              isError
                ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                : "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <form className="space-y-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 dark:border-gray-600 rounded-lg w-full py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition duration-150"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 dark:border-gray-600 rounded-lg w-full py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition duration-150"
              required
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleRegister}
              className="w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-[1.02] bg-gradient-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 dark:from-green-500 dark:to-teal-600 dark:hover:from-green-600 dark:hover:to-teal-700 shadow-md hover:shadow-lg"
            >
              Register
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none underline transition duration-150"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
