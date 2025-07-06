import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import { SparklesIcon } from "@heroicons/react/24/solid"; // <-- Step 1: Import the icon

const LoadingListItem = () => (
  <li className="p-3 mx-1 rounded-lg flex items-center space-x-3 animate-pulse">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700"></div>
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  </li>
);

const ChatList = ({ onSelectChat, refreshTrigger, selectedChatId }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch chats logic
  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/chat/list");
      if (response.data && Array.isArray(response.data)) {
        // Sort chats, pinning the AI chat to the top
        const sortedChats = response.data.sort((a, b) => {
          // Pin GeminiAI to the top
          if (a.receiverName === "GeminiAI") return -1;
          if (b.receiverName === "GeminiAI") return 1;
          // Sort other chats alphabetically by name
          return (a.chatName || "").localeCompare(b.chatName || "");
        });
        setChats(sortedChats);
      } else {
        setChats([]);
        setError("Could not load chats.");
      } // Handle non-array response
    } catch (err) {
      setChats([]); // Clear chats on error
      // Avoid showing auth errors if interceptor handles redirects
      if (err.response?.status !== 401) {
        setError("Error fetching chats. Try again later.");
        console.error("Error fetching chats:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshTrigger]); // Runs on initial mount and when refreshTrigger changes

  return (
    // Component container: light subtle bg, dark slightly darker surface
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 p-2 transition-colors duration-300">
      {loading && (
        <ul className="space-y-1 py-2">
          {" "}
          <LoadingListItem /> <LoadingListItem /> <LoadingListItem />{" "}
        </ul>
      )}

      {error && !loading && (
        <p className="text-center text-red-600 dark:text-red-400 p-4 mx-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600/50">
          {error}
        </p>
      )}

      {!loading && !error && chats.length === 0 && (
        <p className="text-center text-slate-500 dark:text-gray-500 p-8">
          {" "}
          No active chats. <br /> Create one above!{" "}
        </p>
      )}

      {/* Chat List Items */}
      {!loading && !error && chats.length > 0 && (
        <ul className="space-y-1 py-1">
          {chats.map((chat) => {
            // Step 2: Check if the current chat is with the AI
            const isAiChat = chat.receiverName === "GeminiAI";
            return (
              <li
                key={chat.chatId}
                onClick={() => onSelectChat(chat)}
                tabIndex={0}
                onKeyPress={(e) => e.key === "Enter" && onSelectChat(chat)}
                className={`p-3 mx-1 rounded-lg cursor-pointer transition-all duration-200 ease-in-out flex items-center space-x-3 group focus:outline-none focus:ring-1 focus:ring-indigo-400
                          // Common hover/focus styles
                           hover:bg-slate-100 dark:hover:bg-gray-700/50
                          ${
                            selectedChatId === chat.chatId
                              ? // Selected State Styles: Brighter bg, distinct border
                                "bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/60 shadow-sm"
                              : // Non-selected State Styles
                                "border border-transparent" // Keep height consistent
                          }`}
              >
                {/* Step 3: Conditionally render the AI avatar */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium
                      ${
                        isAiChat
                          ? "bg-gradient-to-br from-purple-200 to-indigo-200 text-purple-700 dark:from-purple-800 dark:to-indigo-800 dark:text-purple-300" // AI avatar style
                          : "bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300" // Regular user style
                      }`}
                >
                  {isAiChat ? (
                    <SparklesIcon className="h-6 w-6" /> // AI Icon
                  ) : (
                    chat.receiverName?.charAt(0).toUpperCase() || "?" // User Initial
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  {/* Chat Name */}
                  <p
                    className={`font-semibold truncate text-sm
                        ${
                          selectedChatId === chat.chatId
                            ? "text-indigo-800 dark:text-indigo-100"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                  >
                    {chat.chatName}
                  </p>

                  {/* Step 4: Conditionally render the AI subtitle */}
                  <p
                    className={`text-xs truncate
                        ${
                          selectedChatId === chat.chatId
                            ? "text-indigo-600 dark:text-indigo-300"
                            : "text-slate-500 dark:text-gray-400"
                        }`}
                  >
                    {isAiChat
                      ? "Your Personal Assistant"
                      : `with ${chat.receiverName}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
export default ChatList;
