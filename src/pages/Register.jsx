import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => { /* ... Register handler logic ... */
     setMessage(""); setIsError(false); if (!username.trim() || !password) { setMessage("Username and password are required."); setIsError(true); return; } if (password.length < 6) { setMessage("Password must be at least 6 characters long."); setIsError(true); return; } setLoading(true); try { const response = await apiClient.post("/api/auth/register", { username, password }); setMessage(response.data.message || "Registration successful! Redirecting..."); setIsError(false); setTimeout(() => navigate("/login"), 2000); } catch (error) { setIsError(true); setMessage(error.response?.data?.message || "Registration failed. Please try again."); console.error("Registration error:", error); } finally { setLoading(false); }
   };

  return (
    // Simplified Background
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8
        bg-slate-100 transition-colors duration-300">

      {/* Simplified Card */}
      <div className="w-full max-w-sm p-8 rounded-xl border shadow-lg
          bg-white border-slate-200">

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">Register</h2>

        {/* Feedback Message Box */}
        {message && (
           <p className={`text-center mb-4 text-sm p-2.5 rounded-md border font-medium
             ${isError
               ? 'bg-red-50 text-red-700 border-red-200' // Error style
               : 'bg-green-50 text-green-700 border-green-200' // Success style
              }`}>
             {message}
           </p>
         )}

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-5">
           {/* Username Field */}
           <div>
             <label className="block text-sm font-semibold mb-1.5 text-slate-700" htmlFor="username">Username</label>
             <input id="username" type="text" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading}
                 className="w-full py-2.5 px-4 rounded-lg border transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent text-sm
                    bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed" />
           </div>
           {/* Password Field */}
           <div>
             <label className="block text-sm font-semibold mb-1.5 text-slate-700" htmlFor="password">Password</label>
             <input id="password" type="password" placeholder="Create a secure password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg border transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent text-sm
                     bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500
                     disabled:opacity-50 disabled:cursor-not-allowed" />
           </div>

           {/* Submit Button */}
           <div className="pt-2">
              <button type="submit" disabled={loading}
                 className={`w-full text-white font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out transform active:scale-95
                    ${loading ? 'bg-slate-400 cursor-not-allowed'
                              : 'hover:scale-[1.02] shadow hover:shadow-md focus:ring-offset-white \
                                 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    }`}>
                {loading ? 'Registering...' : 'Create Account'}
              </button>
           </div>
        </form>

        {/* Link to Login */}
        <p className="mt-6 text-center text-sm text-slate-600">
           Already have an account?{' '}
           <button onClick={() => navigate('/login')} className="font-medium underline transition duration-150 focus:outline-none text-indigo-600 hover:text-indigo-800">
              Login here
           </button>
        </p>
      </div>
    </div>
  );
};
export default Register;