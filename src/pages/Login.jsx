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
   const from = location.state?.from?.pathname || "/welcome";

   // Session check logic (remains the same)
    useEffect(() => { /* ... */ }, [navigate, from]);
   const handleLogin = async (event) => { /* ... */
       event.preventDefault();
       setError("");
       if (!username || !password) { setError("Please enter username and password."); return; }
       setLoading(true);
       try { /* ... apiClient call ... */
           const response = await apiClient.post("/api/auth/login", { username, password });
           if (response.status === 200 && response.data.message === "User logged in successfully!") {
               navigate(from, { replace: true });
           } else { setError(response.data.message || "Login failed. Unexpected response."); }
       } catch (error) { /* ... error handling ... */
           if (error.response && error.response.status === 401) { setError("Invalid username or password!"); }
           else { setError("Login failed. Please check network or try again later."); console.error("Login error:", error); }
       } finally { setLoading(false); }
   };

  return (
     // Light: Very light gradient, maybe slight pattern/texture if desired
     // Dark: Deep solid color or very dark gradient, maybe subtle texture
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8
      bg-gradient-to-br from-gray-50 to-blue-100  // Light, airy gradient
      dark:bg-gradient-to-br dark:from-gray-900 dark:to-black // Dark, deep gradient
      transition-colors duration-300 ease-in-out"
    >
       {/* Card Styling */}
      <div className="w-full max-w-sm p-8 rounded-xl shadow-xl border
        bg-white                    dark:bg-gray-800/90  // Dark slightly translucent/glassy? Or solid classic-dark-surface
        border-gray-200             dark:border-gray-700
        dark:shadow-2xl               // Can adjust shadow darkness too
        transition-colors duration-300"
      >
        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6
         text-gray-800              dark:text-gray-100">Login</h2>

        {/* Error Message Box */}
        {error && (
          <p className="text-center mb-4 text-sm p-2 rounded-md border
             bg-red-50 text-red-600 border-red-200               // Light error style
             dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50  // Dark error style
          ">{error}</p>
        )}

        {/* Form Styling */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
             {/* Label */}
             <label className="block text-sm font-semibold mb-2
                text-gray-700          dark:text-gray-300" htmlFor="username">
              Username
             </label>
             {/* Input */}
             <input
               id="username" type="text" placeholder="Enter your username"
               value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading}
               className="shadow-sm appearance-none rounded-lg w-full py-3 px-4 leading-tight transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent
                 bg-gray-100 border border-gray-300 text-gray-800 focus:ring-indigo-500 // Light Input
                 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-400 dark:placeholder-gray-400 // Dark Input
                "
             />
           </div>
           <div>
             {/* Label */}
             <label className="block text-sm font-semibold mb-2
               text-gray-700         dark:text-gray-300" htmlFor="password">
               Password
             </label>
             {/* Input */}
             <input
               id="password" type="password" placeholder="Enter your password"
               value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
               className="shadow-sm appearance-none rounded-lg w-full py-3 px-4 leading-tight transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent
                  bg-gray-100 border border-gray-300 text-gray-800 focus:ring-indigo-500 // Light Input
                  dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-400 dark:placeholder-gray-400 // Dark Input
                "
             />
           </div>

           {/* Submit Button */}
           <div className="pt-2">
             <button type="submit" disabled={loading}
               className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform
                 ${loading
                   ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed scale-100' // Consistent disabled style
                   : 'hover:scale-[1.03] active:scale-100 shadow-md hover:shadow-lg \
                      bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800  \
                      dark:bg-gradient-to-r dark:from-indigo-500 dark:to-purple-600 dark:hover:from-indigo-600 dark:hover:to-purple-700' // Different gradients
                 }`}
             >{loading ? 'Logging in...' : 'Login'}</button>
           </div>
         </form>

         {/* Link to Register */}
         <p className="mt-6 text-center text-sm
           text-gray-600              dark:text-gray-400">
           Don't have an account?{' '}
           <button onClick={() => navigate('/register')}
              className="font-semibold underline transition duration-150 focus:outline-none
              text-indigo-600 hover:text-indigo-500   // Light Link
              dark:text-indigo-400 dark:hover:text-indigo-300 // Dark Link
            ">
             Register here
           </button>
         </p>
       </div>
     </div>
  );
};

export default Login;