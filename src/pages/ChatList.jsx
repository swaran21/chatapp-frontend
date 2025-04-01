import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import apiClient from "../api/axiosConfig"; // Use apiClient

const ChatList = ({ onSelectChat, refreshTrigger }) => { // Added refreshTrigger prop
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // No need for isLoggedIn state if we rely on API calls succeeding/failing

  const fetchChats = useCallback(async () => { // Wrap fetch logic in useCallback
    setLoading(true);
    setError("");
    try {
      // Session check is implicitly done by the API call requiring auth
      const response = await apiClient.get("/api/chat/list"); // Use apiClient, relative URL
      // No need for separate /session call unless you want initial logged-in status before fetching

      if (response.data && Array.isArray(response.data)) {
        setChats(response.data);
        if (response.data.length === 0) {
            setError("No chats available. Create one!"); // Informative message
        }
      } else {
        setChats([]);
        setError("Received unexpected data format for chats.");
      }
    } catch (error) {
      // Interceptor handles 401/403 redirects, catch other errors
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        setError("Error fetching chats. Please try refreshing.");
        console.error("Error fetching chats:", error);
      } else {
        setError(""); // Clear error if it was an auth error handled by interceptor
      }
      setChats([]); // Clear chats on error
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed if it only fetches

  // Fetch chats on mount and when refreshTrigger changes
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
              tabIndex={0} // Make it focusable
              onKeyPress={(e) => e.key === 'Enter' && onSelectChat(chat)} // Allow selection with Enter key
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