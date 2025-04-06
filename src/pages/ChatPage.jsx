import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import ChatList from "../components/ChatList";
import ChatBox from "../components/ChatBox";
import Navbar from "../components/Navbar";
import CreateChat from "../components/CreateChat";
import { useNavigate } from "react-router-dom"; // For redirecting if session check fails

const ChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshChatList, setRefreshChatList] = useState(0); // State to trigger list refresh
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsername = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/api/auth/session");
        if (response.data.loggedIn) {
          setCurrentUser(response.data.username);
        } else {
          console.log("User not logged in, redirecting from ChatPage.");
          navigate("/login");
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Error fetching user session:", error);
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsername();
  }, [navigate]);

  const handleChatCreated = useCallback((newChat) => {
    setSelectedChat(newChat); // Select the newly created chat
    setRefreshChatList(prev => prev + 1); // Increment to trigger refresh
  }, []);

  const handleChatDeleted = useCallback((deletedChatId) => {
    if (selectedChat?.chatId === deletedChatId) {
      setSelectedChat(null);
    }
    setRefreshChatList(prev => prev + 1);
  }, [selectedChat?.chatId]); // Depend on selectedChatId
  
  if (loading) {
    return (
      <>
        <Navbar />
        {/* Use the same loading indicator as Welcome for consistency */}
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
          <span className="ml-3 text-lg">Loading user data...</span>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
    <Navbar />
    <div className="flex flex-1 overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Left Pane: Sidebar */}
        <div className="w-full md:w-[300px] lg:w-[350px] flex flex-col border-r border-border-light dark:border-border-dark flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg z-10">
             {/* Pass theme-aware classes if needed, or rely on components being themed */}
            <CreateChat onChatCreated={handleChatCreated} />
            <div className="flex-1 overflow-y-auto">
                <ChatList
                    onSelectChat={setSelectedChat}
                    refreshTrigger={refreshChatList}
                    selectedChatId={selectedChat?.chatId} 
                />
            </div>
        </div>

        {/* Right Pane: Chat Box or Placeholder */}
         <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/80 backdrop-blur-sm"> {/* Subtle blur background */}
            {selectedChat && currentUser ? (
                 // ChatBox needs comprehensive theming
                <ChatBox
                    chat={selectedChat}
                    currentUser={currentUser}
                    onChatDeleted={handleChatDeleted}
                />
            ) : (
                 // Themed Placeholder
                <div className="text-center p-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2s10 4.477 10 10z" />
                    </svg>
                     <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                        Select a chat or create a new one
                     </p>
                     <p className="text-sm text-muted-light dark:text-muted-dark mt-1">Start messaging!</p>
                 </div>
            )}
         </div>
     </div>
    </div>
);
};

export default ChatPage;