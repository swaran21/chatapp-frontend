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

  useEffect(() => { 
     const checkSession = async () => { try { const response = await apiClient.get("/api/auth/session"); if (response.data.loggedIn) { navigate(from, { replace: true }); } } catch (error) { if (error.response?.status !== 401) console.error("Session check failed:", error); } }; checkSession();
  }, [navigate, from]);

  const handleLogin = async (event) => { 
      event.preventDefault(); setError(""); if (!username || !password) { setError("Please enter username and password."); return; } setLoading(true); try { const response = await apiClient.post("/api/auth/login", { username, password }); if (response.status === 200 && response.data.message === "User logged in successfully!") { navigate(from, { replace: true }); } else { setError(response.data.message || "Login failed."); } } catch (err) { setError(err.response?.data?.message || err.response?.status === 401 ? "Invalid username or password." : "Login failed. Please try again."); if (err.response?.status !== 401) console.error("Login error:", err); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8
        bg-slate-100 transition-colors duration-300">

      <div className="w-full max-w-sm p-8 rounded-xl border shadow-lg
          bg-white border-slate-200">

        <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">Login</h2>

        {error && (
          <p className="text-center mb-4 text-sm p-2.5 rounded-md border font-medium
              bg-red-50 text-red-700 border-red-200">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
             <label className="block text-sm font-semibold mb-1.5 text-slate-700" htmlFor="username">Username</label>
             <input id="username" type="text" placeholder="Your username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg border transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent text-sm
                   bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
              />
           </div>
           <div>
             <label className="block text-sm font-semibold mb-1.5 text-slate-700" htmlFor="password">Password</label>
             <input id="password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                 className="w-full py-2.5 px-4 rounded-lg border transition duration-150 focus:outline-none focus:ring-2 focus:border-transparent text-sm
                    bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
              />
           </div>

           <div className="pt-2">
              <button type="submit" disabled={loading}
                  className={`w-full text-white font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out transform active:scale-95
                     ${loading ? 'bg-slate-400 cursor-not-allowed'
                               : 'hover:scale-[1.02] shadow hover:shadow-md focus:ring-offset-white \
                                  bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                     }`}>
                {loading ? 'Processing...' : 'Login'}
              </button>
           </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
           Don't have an account?{' '}
           <button onClick={() => navigate('/register')} className="font-medium underline transition duration-150 focus:outline-none text-indigo-600 hover:text-indigo-800">
              Register here
           </button>
        </p>
      </div>
    </div>
  );
};
export default Login;