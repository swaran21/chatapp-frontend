import React, { useState } from "react";
import apiClient from "../api/axiosConfig";
import { motion as Motion } from "framer-motion";
import { PlusIcon, UserPlusIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const CreateChat = ({ onChatCreated }) => {
  const [chatName, setChatName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleCreateChat = async (event) => {
    event.preventDefault();
    if (!chatName.trim() || !receiverName.trim()) { setMessage("Add a chat name and a username to continue."); setIsError(true); return; }
    setMessage(""); setIsError(false); setLoading(true);
    try { const response = await apiClient.post("/api/chat/create", { chatName: chatName.trim(), receiverName: receiverName.trim() }); setMessage("Conversation created"); onChatCreated?.(response.data); setChatName(""); setReceiverName(""); }
    catch (error) { setIsError(true); setMessage(error.response?.data?.message || "Could not create conversation."); }
    finally { setLoading(false); window.setTimeout(() => setMessage(""), 3500); }
  };
  return <Motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateChat} className="border-b border-slate-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 p-4">
    <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-300/30"><UserPlusIcon className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-900">Start something new</h3><p className="text-xs text-slate-500">Invite someone into a conversation</p></div></div>
    <div className="space-y-2"><input value={chatName} onChange={(e) => setChatName(e.target.value)} placeholder="Conversation name" disabled={loading} className="w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60" /><div className="flex gap-2"><input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Username" disabled={loading} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60" /><button type="submit" disabled={loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-300/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50" aria-label="Create chat">{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <PlusIcon className="h-5 w-5" />}</button></div></div>
    {message && <Motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${isError ? "text-rose-600" : "text-emerald-600"}`}>{isError ? <ExclamationTriangleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}{message}</Motion.p>}
  </Motion.form>;
};
export default CreateChat;