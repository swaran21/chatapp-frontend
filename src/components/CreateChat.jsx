import React, { useState } from "react";
import apiClient from "../api/axiosConfig";

const CreateChat = ({ onChatCreated }) => {
  const [chatName, setChatName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateChat = async () => {
    if (!chatName.trim() || !receiverName.trim()) {
        setMessage("Please enter both Chat Name and Receiver Username.");
        setIsError(true);
        setTimeout(() => setMessage(""), 3000);
        return;
    }
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const response = await apiClient.post( 
        "/api/chat/create",
        { chatName, receiverName }
      );
      setMessage(response.data.message || "Chat created!");
      setIsError(false);
      if (onChatCreated && response.data.chat) {
        onChatCreated(response.data.chat);
      }
      setChatName("");
      setReceiverName("");
    } catch (error) {
      setIsError(true);
       if (error.response) {
            setMessage(error.response.data?.message || `Chat creation failed (Status: ${error.response.status})`);
       } else {
            setMessage("Chat creation failed. Check network or try again.");
       }
      console.error("Error creating chat", error);
    } finally {
        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    // Themed container for the create chat section
   <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
     <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Create New Chat</h3>
     <div className="space-y-3">
       <input
         type="text"
         placeholder="Unique Chat Name"
         value={chatName}
         onChange={(e) => setChatName(e.target.value)}
         className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition duration-150"
         disabled={loading}
       />
       <input
         type="text"
         placeholder="Other User's Username"
         value={receiverName}
         onChange={(e) => setReceiverName(e.target.value)}
         className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition duration-150"
         disabled={loading}
       />
       <button
         onClick={handleCreateChat}
          className={`w-full text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-[1.02]
                ${loading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 dark:from-emerald-400 dark:to-teal-500 dark:hover:from-emerald-500 dark:hover:to-teal-600 shadow hover:shadow-md'}`}
         disabled={loading}
       >
         {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
             </div>
         ) : "Create Chat"}
       </button>
     </div>
      {/* Message Area - More Visible */}
       {message && (
        <p className={`mt-3 text-xs px-3 py-2 rounded-md text-center border ${ isError
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
          }`}>
          {message}
        </p>
       )}
   </div>
 );
};


export default CreateChat;