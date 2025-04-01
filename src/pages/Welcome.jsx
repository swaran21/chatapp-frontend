import React, { useEffect, useState } from "react"; // Added useState
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig"; // Use apiClient
import Navbar from "../components/Navbar";

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(''); // State to hold username
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
            <div className="flex items-center justify-center h-screen">Loading...</div>
        </>
    )
  }

  return (
    <>
      <Navbar />
      {/* Your existing styled welcome div */}
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url("https://source.unsplash.com/random/1920x1080/?chat,abstract")' }}></div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide animate__animated animate__fadeIn animate__delay-1s">
             Welcome, {username}! {/* Display username */}
          </h1>
           <p className="mt-4 text-lg md:text-xl animate__animated animate__fadeIn animate__delay-1s">Ready to chat?</p>
          <button
            onClick={() => navigate("/chatPage")}
            className="mt-8 px-8 py-3 bg-green-600 text-white rounded-lg text-xl font-semibold transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-green-700 animate__animated animate__fadeIn animate__delay-2s"
          >
            Go to Chat Page
          </button>
        </div>
      </div>
    </>
  );
};

export default Welcome;