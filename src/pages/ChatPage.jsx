import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosConfig";
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

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)]"> 
        <div className="w-full md:w-1/3 flex flex-col border-r border-gray-300">
          <CreateChat onChatCreated={handleChatCreated} />
          <div className="flex-1 overflow-y-auto">
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
                onChatDeleted={handleChatDeleted}
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