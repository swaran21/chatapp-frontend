// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = async () => { /* ...logout logic... */
      try {
        const response = await apiClient.get("/api/auth/logout");
        if (response.status === 200) {
          console.log("Logout successful");
          navigate("/login", { replace: true });
        } else {
          console.error("Logout failed: Unexpected status", response.status);
          alert("Logout failed. Please try again.");
        }
      } catch (error) {
         // Improved error logging from previous answer is good here
        console.error("Logout failed:", error);
         // Avoid multiple alerts if interceptor handles 401 etc.
        if (error.response?.status !== 401) {
             alert("Logout failed. Please check connection or try again.");
         }
        navigate("/login", { replace: true }); // Fallback redirect
      }
   };

  return (
    // Light: Clean white, subtle shadow, light border
    // Dark: Deep gray, slightly stronger border, potentially different shadow/glow
    <div className="sticky top-0 z-50 flex justify-between items-center h-16 px-4 sm:px-6
       bg-white                   dark:bg-gray-900            // Core background difference
       shadow-sm                  dark:shadow-lg                // Subtle light shadow, more pronounced dark
       border-b border-gray-200   dark:border-gray-700        // Light vs Darker border
       transition-colors duration-300 ease-in-out"           // Smooth color change
     >
      {/* Left side: Brand */}
      <div>
         {/* Light: Standard bright primary */}
         {/* Dark: Slightly muted/cooler primary */}
         <span className="text-lg font-semibold
            text-indigo-600            dark:text-indigo-400
            transition-colors duration-300">
           ChatClassic
         </span>
      </div>

      {/* Right side: Controls */}
      <div className="flex items-center space-x-3 md:space-x-4">
         <ThemeToggle /> {/* Handles its own theme display */}

         <button
          onClick={handleLogout}
          // Light: Standard bright red gradient button
          // Dark: Maybe a less intense red or a solid color button
           className="px-4 py-2 text-sm font-medium rounded-lg shadow focus:outline-none transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-100 focus:ring-2 focus:ring-offset-2
             text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:ring-red-500 // Light mode styles

             dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-500 dark:focus:ring-offset-gray-900 // Dark mode: Solid, slightly darker red
             "
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;