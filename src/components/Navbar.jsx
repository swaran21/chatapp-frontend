import React from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig"; // Use apiClient

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
       // Use apiClient, relative URL, GET method as defined in SecurityConfig
      const response = await apiClient.get("/api/auth/logout");

      // Check for OK status from HttpStatusReturningLogoutSuccessHandler
      if (response.status === 200) {
        console.log("Logout successful");
        navigate("/login"); // Redirect to login page
      } else {
         // Should not happen with default Spring Security logout handling
        console.error("Logout failed: Unexpected status", response.status);
         alert("Logout failed. Please try again.");
      }
    } catch (error) {
        // Interceptor might handle 401 if logout fails unexpectedly due to session issue
      console.error("Logout failed:", error);
       alert("Logout failed. Please try again.");
       // Optionally redirect to login even on error
       navigate("/login");
    }
  };

  return (
     // Keep your existing stylish Navbar JSX
    <div className="flex justify-end items-center h-16 px-6 bg-gradient-to-r from-indigo-600 via-purple-700 to-pink-600 shadow-lg sticky top-0 z-50">
      <button
        onClick={handleLogout}
        className="px-5 py-2 text-md font-medium text-white bg-red-500 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out transform hover:scale-105"
      >
        Logout
      </button>
    </div>
  );
};

export default Navbar;