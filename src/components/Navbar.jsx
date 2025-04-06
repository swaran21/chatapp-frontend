import React from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await apiClient.get("/api/auth/logout");
      if (response.status === 200) {
        console.log("Logout successful");
        navigate("/login", { replace: true });
      } else {
        console.error("Logout failed: Unexpected status", response.status, response.data);
        alert(`Logout failed (Status: ${response.status}). Please try again.`);
      }
    } catch (error) {
      console.error("Logout request failed:", error);
       if (error.response?.status !== 401) {
           alert("Logout failed. Please check connection or try again.");
       }
       navigate("/login", { replace: true });
    }
  };

  return (
    <div className="sticky top-0 z-50 flex justify-between items-center h-16 px-4 sm:px-6
       bg-white                     dark:bg-gray-900
       shadow-sm                    dark:shadow-none // Remove shadow for classic dark
       border-b border-slate-200    dark:border-gray-700
       transition-colors duration-300 ease-in-out">
      <div>
         <span className="text-xl font-bold
            text-indigo-600           dark:text-indigo-400
            transition-colors duration-300">
           ChatApp
         </span>
      </div>

      <div className="flex items-center space-x-3 md:space-x-4">
         <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium rounded-lg shadow focus:outline-none transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-100 focus:ring-2 focus:ring-offset-2
               text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:ring-red-500 focus:ring-offset-white // Light Style
               dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-500 dark:focus:ring-offset-gray-900 dark:shadow-none // Dark Style (solid, no extra shadow)
              ">
            Logout
         </button>
      </div>
    </div>
  );
};

export default Navbar;