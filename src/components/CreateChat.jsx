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
    <div className="p-4 bg-gray-200 border-b border-gray-300">
       <h3 className="text-md font-semibold mb-2">Create New Chat</h3>
      <input
        type="text"
        placeholder="Chat Name"
        value={chatName}
        onChange={(e) => setChatName(e.target.value)}
        className="p-2 border mb-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Receiver's Username"
        value={receiverName}
        onChange={(e) => setReceiverName(e.target.value)}
        className="p-2 border mb-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        disabled={loading}
      />
      <button
        onClick={handleCreateChat}
        className="bg-blue-500 text-white p-2 w-full rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={loading}
       >
        {loading ? "Creating..." : "Create Chat"}
      </button>
      {message && (
            <p className={`mt-2 text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
                {message}
            </p>
       )}
    </div>
  );
};

export default CreateChat;