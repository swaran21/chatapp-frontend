import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import apiClient from "../api/axiosConfig"; // Use apiClient
import ChatList from "./ChatList";
import ChatBox from "./ChatBox";
import Navbar from "../components/Navbar";
import CreateChat from "./CreateChat";
import { useNavigate } from "react-router-dom"; // For redirecting if session check fails

const ChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshChatList, setRefreshChatList] = useState(0); // State to trigger list refresh
  const navigate = useNavigate();

  // Fetch current user session
  useEffect(() => {
    const fetchUsername = async () => {
       setLoading(true);
      try {
        const response = await apiClient.get("/api/auth/session"); // Use apiClient
        if (response.data.loggedIn) {
          setCurrentUser(response.data.username);
        } else {
          console.log("User not logged in, redirecting from ChatPage.");
          navigate("/login"); // Redirect if not logged in
        }
      } catch (error) {
         // Interceptor handles 401 redirect
        if (error.response?.status !== 401) {
            console.error("Error fetching user session:", error);
            navigate("/login"); // Fallback redirect
        }
      } finally {
          setLoading(false);
      }
    };
    fetchUsername();
  }, [navigate]);

  // Callback to refresh the chat list
  const handleChatCreated = useCallback((newChat) => {
      setSelectedChat(newChat); // Select the newly created chat
      setRefreshChatList(prev => prev + 1); // Increment to trigger refresh
  }, []);

  // Callback after a chat is deleted
   const handleChatDeleted = useCallback((deletedChatId) => {
       setSelectedChat(null); // Deselect the chat
       setRefreshChatList(prev => prev + 1); // Trigger list refresh
   }, []);

  if (loading) {
     return (
        <>
            <Navbar />
            <div className="flex justify-center items-center h-screen">Loading user data...</div>
        </>
     )
  }

  // Only render chat interface if currentUser is loaded
  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)]"> {/* Adjust height based on Navbar height */}
        {/* Left Pane: Create Chat + Chat List */}
        <div className="w-full md:w-1/3 flex flex-col border-r border-gray-300">
          <CreateChat onChatCreated={handleChatCreated} />
          <div className="flex-1 overflow-y-auto"> {/* Make list scrollable */}
             <ChatList
                 onSelectChat={setSelectedChat}
                 refreshTrigger={refreshChatList} // Pass trigger
             />
          </div>
        </div>
        {/* Right Pane: Chat Box or Placeholder */}
        <div className="w-full md:w-2/3 flex items-center justify-center bg-gray-100"> {/* Added bg */}
          {selectedChat && currentUser ? (
             <ChatBox
                chat={selectedChat}
                currentUser={currentUser}
                onChatDeleted={handleChatDeleted} // Pass delete handler
            />
          ) : (
            <p className="text-gray-500 text-lg p-10 text-center">
                Select a chat from the list or create a new one to start messaging.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPage;