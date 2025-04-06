import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import Navbar from "../components/Navbar"; // Ensure Navbar is themed

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true); // Start loading
       try {
          const response = await apiClient.get("/api/auth/session");
          if (response.data.loggedIn) { setUsername(response.data.username); }
          else { console.log("Not logged in"); navigate("/login", { replace: true }); }
       } catch (error) {
          console.error("Session check failed:", error);
          if (error.response?.status !== 401) { navigate("/login", { replace: true }); }
          // 401 might be handled by interceptor or page redirects naturally
       } finally { setLoading(false); } // Stop loading
    };
    checkSession();
   }, [navigate]);

  // Loading State UI
  if (loading) {
    return (
      <>
        <Navbar />
         {/* Centered loading spinner for the whole page area */}
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]
            bg-slate-100 dark:bg-gray-900
            text-slate-500 dark:text-slate-400 transition-colors duration-300">
            <LoadingSpinner />
             <p className="mt-3 text-lg">Loading your session...</p>
        </div>
      </>
    );
  }

  // Welcome Page Content
  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-gray-900 transition-colors duration-300">
        <Navbar />
      {/* Main Content Area with potential subtle gradient */}
      <div className="flex-grow flex items-center justify-center text-center relative overflow-hidden p-4
          bg-gradient-to-br from-slate-50 to-white // Very subtle light gradient
          dark:from-gray-900 dark:to-black       // Dark deep gradient
        ">

            {/* Optional subtle background shapes */}
            <div className="absolute bottom-5 right-5 w-32 h-32 bg-gradient-to-tl from-blue-200 to-transparent rounded-full opacity-20 dark:opacity-10 dark:from-blue-900 filter blur-2xl animate-subtlePulse"></div>

             {/* Centered Content */}
            <div className="relative z-10 flex flex-col items-center">
               {/* Welcome Title: Contrasting colors */}
               <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3
                    text-slate-800            dark:text-slate-100">
                  Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{username}</span>!
               </h1>
               {/* Subtitle */}
               <p className="mt-2 text-lg max-w-lg
                   text-slate-600            dark:text-slate-400">
                   Ready to dive into your conversations?
               </p>
               {/* Action Button: Uses secondary accent */}
               <button
                  onClick={() => navigate("/chatPage")}
                   className="mt-10 px-8 py-3 text-xl font-semibold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-100
                       bg-gradient-to-r from-emerald-500 to-teal-600 text-white focus:ring-emerald-500 focus:ring-offset-white // Light Button
                       dark:bg-gradient-to-r dark:from-teal-500 dark:to-cyan-600 dark:hover:from-teal-600 dark:hover:to-cyan-700 dark:focus:ring-teal-400 dark:focus:ring-offset-gray-900 dark:shadow-none // Dark Button
                      ">
                    Go to Chats
               </button>
            </div>
      </div>
    </div>
  );
};

export default Welcome;