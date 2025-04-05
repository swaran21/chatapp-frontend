import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/axiosConfig";

const ChatList = ({ onSelectChat, refreshTrigger }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/chat/list"); 

      if (response.data && Array.isArray(response.data)) {
        setChats(response.data);
        if (response.data.length === 0) {
            setError("No chats available. Create one!");
        }
      } else {
        setChats([]);
        setError("Received unexpected data format for chats.");
      }
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        setError("Error fetching chats. Please try refreshing.");
        console.error("Error fetching chats:", error);
      } else {
        setError("");
      }
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshTrigger]);

  return (
    <div className="p-4 bg-gray-100 h-full overflow-y-auto border-t border-gray-300">
      <h2 className="text-lg font-bold mb-3">Your Chats</h2>

       {loading && <div className="text-center p-4">Loading chats...</div>}

      {error && !loading && <p className="text-center text-red-500 p-2 bg-red-100 rounded">{error}</p>}

      {!loading && chats.length > 0 && (
        <ul className="space-y-2"> {/* Use a list for semantics */}
          {chats.map((chat) => (
            <li
              key={chat.chatId}
              className="p-3 bg-white rounded shadow-sm cursor-pointer hover:bg-blue-50 transition duration-150 ease-in-out"
              onClick={() => onSelectChat(chat)}
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && onSelectChat(chat)}
            >
              <p className="font-semibold text-blue-700">{chat.chatName}</p>
              <p className="text-sm text-gray-600">Chat with: {chat.receiverName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;