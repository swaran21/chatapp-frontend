import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import ChatList from "../components/ChatList";
import ChatBox from "../components/ChatBox";
import Navbar from "../components/Navbar";
import CreateChat from "../components/CreateChat";
import { useNavigate } from "react-router-dom";
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const ChatPage = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshChatList, setRefreshChatList] = useState(0); // For triggering refetch
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsername = async () => {
           setLoading(true);
           try {
               const response = await apiClient.get("/api/auth/session");
               if (response.data.loggedIn) { setCurrentUser(response.data.username); }
               else { console.log("User not logged in, redirecting."); navigate("/login", {replace: true}); }
           } catch (error) {
               console.error("Error fetching user session:", error);
               if(error.response?.status !== 401) { navigate("/login", {replace: true}); }
           } finally { setLoading(false); }
       };
       fetchUsername();
    }, [navigate]);

    const handleSelectChat = useCallback((chat) => {
        setSelectedChat(chat);
    }, []);

    const handleChatCreated = useCallback((newChat) => {
        setSelectedChat(newChat); 
        setRefreshChatList(prev => prev + 1); // Trigger list refresh
    }, []);

    const handleChatDeleted = useCallback((deletedChatId) => {
        if (selectedChat?.chatId === deletedChatId) { setSelectedChat(null); }
        setRefreshChatList(prev => prev + 1); // Trigger list refresh
    }, [selectedChat]);

    if (loading) {
       return ( <>
         <Navbar />
         <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
              <span className="ml-3 text-lg">Loading Chat...</span>
         </div>
       </> );
    }

    // Main Chat Layout
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-gray-900">
            <Navbar />
             <div className="flex flex-1 overflow-hidden">

                 {/* Left Sidebar: Chat List and Create Chat */}
                 {/* Light: White surface, light borders. Dark: Dark surface, distinct borders */}
                 <div className="w-full md:w-[320px] lg:w-[360px] flex flex-col flex-shrink-0 border-r bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700">
                     <CreateChat onChatCreated={handleChatCreated} /> 
                     <div className="flex-1 overflow-y-auto">
                         <ChatList
                            onSelectChat={handleSelectChat}
                             refreshTrigger={refreshChatList}
                            selectedChatId={selectedChat?.chatId} // Pass selected ID for highlighting
                         /> 
                    </div>
                 </div>

                 {/* Right Pane: Chat Box or Placeholder */}
                 <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-gray-900"> {/* Chatbox/placeholder background */}
                    {selectedChat && currentUser ? (
                         <ChatBox
                            chat={selectedChat}
                            currentUser={currentUser}
                            onChatDeleted={handleChatDeleted}
                         /> // Component needs major theming
                     ) : (
                         // Placeholder shown when no chat is selected
                         <div className="text-center p-10 flex flex-col items-center">
                            <ChatBubbleLeftRightIcon className="h-16 w-16 text-slate-400 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                                Select a Chat
                            </p>
                            <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                                Choose a conversation from the list or create a new one to start messaging.
                            </p>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};
export default ChatPage;