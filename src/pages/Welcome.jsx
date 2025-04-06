import React, { useEffect, useState } from "react"; // Added useState
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import Navbar from "../components/Navbar";

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/api/auth/session"); // Use apiClient, relative URL
        if (response.data.loggedIn) {
            setUsername(response.data.username); // Store username
        } else {
           console.log("Not logged in, redirecting to login.");
           navigate("/login"); // Redirect if not logged in
        }
      } catch (error) {
         // Interceptor likely handles 401 redirection
        console.error("Session check failed in Welcome:", error);
        if (error.response?.status !== 401) {
            // Handle other errors if needed, maybe show an error message
            navigate("/login"); // Fallback redirect
        }
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [navigate]); // Add navigate dependency

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            {/* Add a nice spinner maybe */}
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
            <span className="ml-3 text-lg">Loading session...</span>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
        <Navbar />
      <div className="flex-grow flex items-center justify-center text-foreground-light dark:text-foreground-dark relative overflow-hidden p-4">
           {/* Animated Gradient Background */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-green-200 via-blue-300 to-purple-300 dark:from-green-900/70 dark:via-blue-900/80 dark:to-purple-900/70 animate-gradientShift bg-size-200 opacity-50 dark:opacity-30 blur-3xl"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 mb-4">
                  Welcome back, {username}!
              </h1>
              <button
                onClick={() => navigate("/chatPage")}
                className="mt-10 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xl font-semibold transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-900 shadow-md dark:from-emerald-400 dark:to-teal-500 dark:hover:from-emerald-500 dark:hover:to-teal-600"
                >
                    Start Chatting
              </button>
            </div>

             {/* Subtle decorative elements */}
             <div className="absolute bottom-10 right-10 w-24 h-24 bg-gradient-to-tl from-cyan-400 to-blue-500 dark:from-cyan-700 dark:to-blue-800 rounded-full opacity-20 dark:opacity-30 filter blur-2xl animate-pulse"></div>
      </div>
    </div>
  );
};


export default Welcome;