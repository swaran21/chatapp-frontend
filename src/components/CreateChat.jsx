import React, { useState } from "react";
import apiClient from "../api/axiosConfig";
import { PlusCircleIcon } from '@heroicons/react/24/outline'; // Icon

const CreateChat = ({ onChatCreated }) => {
  const [chatName, setChatName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateChat = async () => {
    // Basic validation
     if (!chatName.trim() || !receiverName.trim()) {
       setMessage("Chat Name and Receiver Username are required."); setIsError(true);
       setTimeout(() => setMessage(""), 3000); // Clear message after delay
       return;
     }
     setMessage(""); setIsError(false); setLoading(true);

     try {
       const response = await apiClient.post("/api/chat/create", { chatName, receiverName });
       setMessage(response.data.message || "Chat created!");
       setIsError(false);
       if (onChatCreated && response.data.chat) { onChatCreated(response.data.chat); }
       setChatName(""); setReceiverName(""); // Clear fields on success
     } catch (error) {
       setIsError(true);
       setMessage(error.response?.data?.message || "Chat creation failed.");
       console.error("Error creating chat", error);
     } finally {
        setLoading(false);
       // Auto-clear message regardless of outcome
       setTimeout(() => setMessage(""), 3500);
     }
  };

  return (
     // Light: Light surface, clear division. Dark: Dark surface, clear division.
    <div className="p-4 border-b bg-slate-50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700">
       <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200">
         <PlusCircleIcon className="h-5 w-5 mr-2 text-indigo-500 dark:text-indigo-400" />
         Create New Chat
       </h3>
       <div className="space-y-3">
         {/* Inputs */}
         <input type="text" placeholder="Chat Name" value={chatName} onChange={(e) => setChatName(e.target.value)} disabled={loading}
             className="w-full p-2 rounded-md border text-sm focus:outline-none focus:ring-1 transition duration-150 disabled:opacity-60
                bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500   // Light input
                dark:bg-gray-700 dark:border-gray-600 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 // Dark input
               " />
         <input type="text" placeholder="Receiver's Username" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} disabled={loading}
             className="w-full p-2 rounded-md border text-sm focus:outline-none focus:ring-1 transition duration-150 disabled:opacity-60
                bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500   // Light input
                dark:bg-gray-700 dark:border-gray-600 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 // Dark input
               " />
          {/* Create Button */}
         <button onClick={handleCreateChat} disabled={loading}
             className={`w-full text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
               ${loading ? 'bg-slate-400 dark:bg-gray-500'
                         : 'hover:scale-[1.02] shadow hover:shadow-md \
                             bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-white \
                             dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800 dark:shadow-none'
               }`} >
           {loading ? "Creating..." : "Create Chat"}
         </button>
       </div>

       {/* Feedback Message Area */}
       {message && (
         <p className={`mt-3 text-xs text-center px-3 py-1.5 rounded font-medium border
             ${isError
               ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600/50'
               : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600/50'
             }`}>
           {message}
         </p>
        )}
     </div>
  );
};

export default CreateChat;