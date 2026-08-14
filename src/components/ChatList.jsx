import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon, SparklesIcon, ChatBubbleOvalLeftEllipsisIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const LoadingListItem = () => <div className="flex animate-pulse items-center gap-3 rounded-2xl p-3"><div className="h-11 w-11 rounded-2xl bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded-full bg-slate-200" /><div className="h-2.5 w-1/2 rounded-full bg-slate-100" /></div></div>;

const ChatList = ({ onSelectChat, refreshTrigger, selectedChatId }) => {
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchChats = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await apiClient.get("/api/chat/list");
      const sorted = Array.isArray(response.data) ? [...response.data].sort((a, b) => {
        if (a.receiverName?.toLowerCase() === "geminiai") return -1;
        if (b.receiverName?.toLowerCase() === "geminiai") return 1;
        return (a.chatName || "").localeCompare(b.chatName || "");
      }) : [];
      setChats(sorted);
    } catch (err) {
      setChats([]); if (err.response?.status !== 401) setError("Could not load your conversations.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchChats(); }, [fetchChats, refreshTrigger]);

  const visibleChats = chats.filter((chat) => `${chat.chatName} ${chat.receiverName}`.toLowerCase().includes(query.toLowerCase().trim()));

  return <div className="soft-scrollbar h-full overflow-y-auto bg-white/35 p-3">
    <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Inbox</p><h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Conversations</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{chats.length}</span></div>
    <label className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 text-slate-400 shadow-sm focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100"><MagnifyingGlassIcon className="h-4 w-4 shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></label>
    {loading && <div className="space-y-1"><LoadingListItem /><LoadingListItem /><LoadingListItem /></div>}
    {!loading && error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center text-sm font-medium text-rose-600"><p>{error}</p><button onClick={fetchChats} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"><ArrowPathIcon className="h-3.5 w-3.5" /> Try again</button></div>}
    {!loading && !error && visibleChats.length === 0 && <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white/55 px-5 py-10 text-center"><ChatBubbleOvalLeftEllipsisIcon className="h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">{query ? "No matches found" : "Your inbox is quiet"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{query ? "Try another search term." : "Create a conversation and make some noise."}</p></div>}
    {!loading && !error && visibleChats.length > 0 && <ul className="space-y-1.5"><AnimatePresence initial={false}>{visibleChats.map((chat) => {
      const isAiChat = chat.receiverName?.toLowerCase() === "geminiai";
      const active = selectedChatId === chat.chatId;
      return <Motion.li key={chat.chatId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .2 }} onClick={() => onSelectChat(chat)} onKeyDown={(event) => event.key === "Enter" && onSelectChat(chat)} tabIndex={0} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400 ${active ? "border-indigo-200 bg-indigo-50 shadow-sm shadow-indigo-100" : "border-transparent hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm"}`}>
        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isAiChat ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-300/30" : "bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-700"}`}>{isAiChat ? <SparklesIcon className="h-5 w-5" /> : chat.receiverName?.charAt(0).toUpperCase() || "?"}<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" /></div>
        <div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${active ? "text-indigo-900" : "text-slate-800"}`}>{chat.chatName}</p><p className={`mt-0.5 truncate text-xs ${active ? "text-indigo-600" : "text-slate-400"}`}>{isAiChat ? "Your personal assistant" : `with ${chat.receiverName}`}</p></div><span className={`h-2 w-2 rounded-full bg-indigo-400 opacity-0 transition-opacity group-hover:opacity-100 ${active ? "opacity-100" : ""}`} />
      </Motion.li>;
    })}</AnimatePresence></ul>}
  </div>;
};
export default ChatList;