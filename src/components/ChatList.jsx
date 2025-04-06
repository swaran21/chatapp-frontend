import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/axiosConfig";

const ChatList = ({ onSelectChat, refreshTrigger, selectedChatId }) => {
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
    <div className="h-full overflow-y-auto border-t border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-2">
      {/* Loading State */}
      {loading && (
        <div className="text-center p-4 text-muted-light dark:text-muted-dark flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
          <span>Loading chats...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <p className="text-center text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg mx-2 text-sm border border-red-300 dark:border-red-700">
          {error}
        </p>
      )}

      {/* Empty Chat State */}
      {!loading && !error && chats.length === 0 && (
        <p className="text-center text-muted-light dark:text-muted-dark p-6">
          No chats found. <br /> Why not create one? 😊
        </p>
      )}

      {/* Chat List */}
      {!loading && chats.length > 0 && (
        <ul className="space-y-1 py-2">
          {chats.map((chat) => (
            <li
              key={chat.chatId}
              className={`p-3 mx-1 rounded-lg cursor-pointer transition-all duration-200 ease-in-out flex items-center space-x-3 border border-transparent
                         ${selectedChatId === chat.chatId
                             ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 shadow-sm'
                             : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
              onClick={() => onSelectChat(chat)}
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && onSelectChat(chat)}
            >
              {/* Avatar Placeholder */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-white font-semibold">
                {chat.receiverName?.charAt(0).toUpperCase()}
              </div>
              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold truncate ${selectedChatId === chat.chatId ? 'text-indigo-800 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}
                >
                  {chat.chatName}
                </p>
                <p
                  className={`text-sm truncate ${selectedChatId === chat.chatId ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-light dark:text-muted-dark'}`}
                >
                  vs: {chat.receiverName}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
