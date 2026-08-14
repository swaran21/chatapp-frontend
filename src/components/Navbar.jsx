import React from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import { ArrowRightOnRectangleIcon, ChatBubbleLeftRightIcon, SignalIcon } from "@heroicons/react/24/outline";

const Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await apiClient.post("/api/auth/logout"); } finally { navigate("/login", { replace: true }); }
  };

  return (
    <header className="relative z-50 flex h-[4.5rem] shrink-0 items-center justify-between border-b border-white/70 bg-white/75 px-4 shadow-[0_8px_30px_rgba(38,48,82,0.06)] backdrop-blur-xl sm:px-7">
      <button onClick={() => navigate("/welcome")} className="group flex items-center gap-3 rounded-2xl p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Go to welcome page">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"><ChatBubbleLeftRightIcon className="h-5 w-5" /></span>
        <span><span className="block text-[15px] font-black tracking-tight text-slate-900">Chat<span className="text-indigo-600">App</span></span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Stay connected</span></span>
      </button>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex"><SignalIcon className="h-3.5 w-3.5" /> Online</span>
        <button onClick={handleLogout} className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400" title="Log out"><ArrowRightOnRectangleIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /><span className="hidden sm:inline">Logout</span></button>
      </div>
    </header>
  );
};
export default Navbar;