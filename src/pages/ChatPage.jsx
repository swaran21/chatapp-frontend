// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
    const [refreshChatList, setRefreshChatList] = useState(0);
    // State to control sidebar visibility on mobile
    const [isMobileChatSelected, setIsMobileChatSelected] = useState(false);
    const navigate = useNavigate();

    // Detect if we are on a mobile-like screen (using resize observer could be more robust)
    // This simple check runs on mount and resize.
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        checkMobile(); // Initial check
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    // Fetch User Session
    useEffect(() => {
        const fetchUsername = async () => {
           setLoading(true);
           try {
               const response = await apiClient.get("/api/auth/session");
               if (response.data.loggedIn) { setCurrentUser(response.data.username); }
               else { console.log("User not logged in, redirecting."); navigate("/login", {replace: true}); }
           } catch (error) {
               console.error("Error fetching user session:", error);
               // Avoid redirect loop if 401 is handled globally
               if(error.response?.status !== 401 && error.response?.status !== 403) {
                    navigate("/login", {replace: true});
               } else if (!error.response) { // Handle network errors too
                    navigate("/login", {replace: true});
               }
           } finally { setLoading(false); }
       };
       fetchUsername();
    }, [navigate]);

    // Handle selecting a chat
    const handleSelectChat = useCallback((chat) => {
        setSelectedChat(chat);
        // If on mobile, hide the sidebar/list view
        if (isMobileView) {
            setIsMobileChatSelected(true);
        }
    }, [isMobileView]); // Dependency on isMobileView

    // Handle creating a chat
    const handleChatCreated = useCallback((newChat) => {
        setRefreshChatList(prev => prev + 1); // Refresh list first
        setSelectedChat(newChat); // Select the new chat
        if (isMobileView) {
            setIsMobileChatSelected(true); // Show chatbox on mobile
        }
    }, [isMobileView]); // Dependency on isMobileView

    // Handle deleting a chat
    const handleChatDeleted = useCallback((deletedChatId) => {
        setRefreshChatList(prev => prev + 1); // Refresh list
        // If the deleted chat was selected, clear selection and show list on mobile
        if (selectedChat?.chatId === deletedChatId) {
             setSelectedChat(null);
             if(isMobileView){
                setIsMobileChatSelected(false); // Show sidebar again on mobile
             }
        }
    }, [selectedChat, isMobileView]); // Dependencies

    // Callback for the "Back" button in ChatBox (mobile only)
    const handleGoBackToList = useCallback(() => {
        setSelectedChat(null);
        setIsMobileChatSelected(false);
    }, []);


    // Loading UI
    if (loading) {
       return ( <>
         <Navbar />
         <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
              <span className="ml-3 text-lg">Loading Chat...</span>
         </div>
       </> );
    }

    // Determine visibility classes for mobile responsiveness
    const sidebarVisibleClass = isMobileView && isMobileChatSelected ? 'hidden md:flex' : 'flex';
    const chatboxVisibleClass = isMobileView && !isMobileChatSelected ? 'hidden md:flex' : 'flex';
    // Transition classes can be added if desired (require more setup)

    // Main Chat Layout
    return (
        // Full height container, flex column
        <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-gray-900">
            <Navbar />
            {/* Main content area, flex row, takes remaining height */}
             {/* Use relative positioning for potential absolute positioned sidebar on mobile */}
            <div className="flex flex-1 overflow-hidden relative">

                 {/* Left Sidebar Wrapper */}
                 {/* On mobile: Full width initially, hidden when chat is selected */}
                 {/* On desktop: Fixed width, always visible */}
                 <div className={`
                    ${sidebarVisibleClass} flex-col flex-shrink-0 border-r bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700
                    w-full md:w-[320px] lg:w-[360px]
                    transition-transform duration-300 ease-in-out md:translate-x-0
                    ${isMobileView && isMobileChatSelected ? '-translate-x-full' : 'translate-x-0'}
                    absolute md:static inset-y-0 left-0 z-20 md:z-0  {/* Absolute position on mobile */}
                 `}>
                     <CreateChat onChatCreated={handleChatCreated} />
                     <div className="flex-1 overflow-y-auto">
                         <ChatList
                            onSelectChat={handleSelectChat}
                            refreshTrigger={refreshChatList}
                            selectedChatId={selectedChat?.chatId}
                         />
                    </div>
                 </div>

                 {/* Right Pane: Chat Box or Placeholder Wrapper */}
                 {/* On mobile: Takes full width when selected, hidden otherwise */}
                 {/* On desktop: Takes remaining width */}
                 <div className={`
                     ${chatboxVisibleClass} flex-1 items-center justify-center bg-slate-50 dark:bg-gray-900/80 backdrop-blur-sm md:bg-slate-100 md:dark:bg-gray-900 md:backdrop-blur-none
                     w-full md:w-auto
                     transition-transform duration-300 ease-in-out md:translate-x-0
                     absolute md:static inset-0 z-10 md:z-0 {/* Lower z-index than sidebar when active */}
                     ${isMobileView && isMobileChatSelected ? 'translate-x-0' : 'translate-x-full'}
                     ${!isMobileChatSelected && !isMobileView && !selectedChat ? 'items-center justify-center': ''} {/* Center placeholder on desktop only */}
                 `}>
                    {selectedChat && currentUser ? (
                         <ChatBox
                            chat={selectedChat}
                            currentUser={currentUser}
                            onChatDeleted={handleChatDeleted}
                            onGoBack={handleGoBackToList} // Pass the callback
                         />
                     ) : (
                         // Placeholder - hidden on mobile unless no chat selected
                         // Visible on desktop if no chat selected
                         <div className={`text-center p-10 flex-col items-center ${ isMobileView ? 'hidden' : 'flex' }`}> {/* Hide placeholder div itself on mobile if chatbox is hidden */}
                            <ChatBubbleLeftRightIcon className="h-16 w-16 text-slate-400 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                                Select a Chat
                            </p>
                            <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                                Choose or create a conversation to start messaging.
                            </p>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};
export default ChatPage;