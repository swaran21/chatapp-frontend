// src/pages/ChatBox.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import apiClient from "../api/axiosConfig"; // Use configured Axios client
import WebSocketService from "../services/WebSocketService"; // Use WebSocket service
import VoiceRecorder from "../components/VoiceRecorder"; // Voice recording component
import { base64ToUint8Array } from "../utils/base64Utils"; // Helper for decoding voice data

// Icons (replace with your preferred icon library like react-icons)
const SendIcon = () => <svg /* ...send icon svg... */ />;
const AttachIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>; // Simple paperclip icon

const ChatBox = ({ chat, currentUser, onChatDeleted }) => {
  // --- State Variables ---
  const [messages, setMessages] = useState([]); // Array of message objects
  const [inputMsg, setInputMsg] = useState(""); // Current text input value
  // Note: selectedFile state is removed as upload happens immediately on select
  const [loadingHistory, setLoadingHistory] = useState(false); // Loading indicator for chat history
  const [error, setError] = useState(''); // Error messages for display
  const [audioBlobUrls, setAudioBlobUrls] = useState({}); // Map message ID -> Blob URL for audio playback
  const [isUploading, setIsUploading] = useState(false); 
  // --- Refs ---
  const messagesEndRef = useRef(null); // Ref to scroll to the bottom of messages
  const fileInputRef = useRef(null); // Ref for the hidden file input element

  // --- Memoized Callbacks for processing and cleanup ---

  // Process incoming/fetched messages: Create Blob URLs for voice messages
  const processMessages = useCallback((messagesToProcess) => {
    if (!Array.isArray(messagesToProcess)) {
        console.error("processMessages received non-array:", messagesToProcess);
        return []; // Return empty array if input is invalid
    }
    const newBlobUrls = {}; // Track newly created URLs in this batch
    const processed = messagesToProcess.map(msg => {
      // Ensure msg and msg.id are valid before processing
      if (!msg || !msg.id) {
        console.warn("Skipping invalid message object:", msg);
        return null; // Skip this message
      }
      if (msg.type === 'VOICE' && msg.content) {
        try {
          const audioBytes = base64ToUint8Array(msg.content);
          const blob = new Blob([audioBytes], { type: msg.audioMimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          newBlobUrls[msg.id] = url; // Store URL by message ID for this batch
          return { ...msg, blobUrl: url }; // Return new message object with blobUrl
        } catch (e) {
          console.error("Error creating blob URL for voice message:", msg.id, e);
          return { ...msg, blobUrl: null, error: 'Failed to load audio' }; // Mark message as failed
        }
      }
      return msg; // Return other message types as is
    }).filter(Boolean); // Filter out any null messages from invalid input

    // Update the state holding ALL blob URLs, merging new ones
    setAudioBlobUrls(prevUrls => ({ ...prevUrls, ...newBlobUrls }));
    return processed;
  }, []); // This callback itself has no external dependencies

  // Revoke all stored blob URLs (for cleanup)
  const revokeAllBlobUrls = useCallback(() => {
    // console.log("Revoking Blob URLs:", Object.keys(audioBlobUrls)); // Debug log
    Object.values(audioBlobUrls).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    setAudioBlobUrls({}); // Clear the state
  }, [audioBlobUrls]); // Depends only on the audioBlobUrls state


  // --- Effects ---

  // Effect 1: Fetch History when selected chat changes
  useEffect(() => {
    // If no chat is selected, clear messages and exit
    if (!chat?.chatId) {
      setMessages([]);
      setError('');
      setLoadingHistory(false); // Ensure loading is off
      return;
    }

    // Start loading, clear previous state
    setLoadingHistory(true);
    setError('');
    setMessages([]);

    // Fetch messages from the backend
    apiClient.get(`/api/chat/${chat.chatId}`)
      .then((res) => {
        // Process fetched messages (create Blob URLs for voice)
        const processedMessages = processMessages(res.data || []); // Ensure data is array
        setMessages(processedMessages);
      })
      .catch((err) => {
        // Handle errors (axios interceptor might handle 401/403)
        if (err.response?.status !== 401 && err.response?.status !== 403) {
            console.error("Error fetching messages:", err);
            setError("Failed to load chat history.");
        } else {
            setError(''); // Clear specific error if it was an auth error
        }
      })
      .finally(() => {
        setLoadingHistory(false); // Stop loading indicator
      });

    // Cleanup function for when chat selection changes *before* history loads
    // or when component unmounts: Revoke any existing blob URLs
    return () => {
      revokeAllBlobUrls();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.chatId, processMessages]); // Rerun when chatId changes or processMessages changes (memoized)
  // Note: revokeAllBlobUrls is not needed in dependency array as it's stable due to useCallback

  // Effect 2: WebSocket Connection and Subscription
  useEffect(() => {
    // Only connect/subscribe if a chat is selected
    if (!chat?.chatId || !currentUser) return;

    // Define the message handler for THIS execution of the effect
    // This function will be passed to the subscription
    const handleNewMessage = (msg) => {
      // Ensure message belongs to the currently active chat
      if (msg.chatId === chat.chatId) {
         // Process the single new message (create blob URL if needed)
         const [processedMsg] = processMessages([msg]);
         if (processedMsg) { // Check if processing was successful
             setMessages((prevMessages) => {
                 // Avoid adding duplicates (simple check by ID)
                 if (prevMessages.some(m => m.id === processedMsg.id)) {
                     return prevMessages;
                 }
                 return [...prevMessages, processedMsg];
             });
         }
      }
    };

    let subscription = null;
    // Connect to WebSocket (promise resolves when connected)
    WebSocketService.connect()
        .then(() => {
            // Subscribe specifically for this chat, providing the handler
            subscription = WebSocketService.subscribeToChat(chat.chatId, handleNewMessage);
        })
        .catch((error) => {
            console.error("Error connecting/subscribing WebSocket:", error);
            setError("Real-time connection failed. Try refreshing.");
        });

    // Cleanup function: Unsubscribe when chat changes or component unmounts
    return () => {
      if (chat?.chatId) {
         WebSocketService.unsubscribeFromChat(chat.chatId);
      }
    };
  // processMessages is memoized and stable unless its own dependencies change
  }, [chat?.chatId, currentUser, processMessages]); // Rerun if chat or user changes

   // Effect 3: Cleanup blob URLs on component unmount
   // This runs only once when the component is finally destroyed
    useEffect(() => {
       return () => {
           revokeAllBlobUrls();
       };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Empty dependency array means run only on unmount

   // Effect 4: Scroll to bottom when messages change
   useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]); // Run whenever the messages array updates

  // --- Event Handlers ---

  // Send a text message
  const sendTextMessage = () => {
    const text = inputMsg.trim();
    if (text === "" || !chat?.chatId || !currentUser) return; // Basic validation

    WebSocketService.sendTextMessage(chat.chatId, currentUser, text);
    setInputMsg(""); // Clear input field after sending
  };

  // Handle Enter key press in input field for sending text
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent adding newline
      sendTextMessage();
    }
  };

  // Handle selection of a (non-voice) file
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
        uploadFile(file); // Immediately attempt upload
        // Clear the input value so the same file can be selected again if needed
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Upload the selected file (non-voice)
  const uploadFile = async (fileToUpload) => {
    if (!fileToUpload || !chat?.chatId || !currentUser) return;
    setError(''); // Clear previous upload errors

    const formData = new FormData();
    formData.append("file", fileToUpload);
    // Backend decides if chatId is needed: formData.append("chatId", chat.chatId);

    try {
      // Use the correct backend endpoint defined in FileUploadController
      const response = await apiClient.post("/api/files/upload", formData);

      // Backend should return info needed for WebSocket message
      const { fileUrl, fileType, fileName } = response.data;

      // Send a message via WebSocket to notify others about the file
      // Use the specific method from WebSocketService
      WebSocketService.sendFileUrlMessage(chat.chatId, currentUser, fileUrl, fileType || fileToUpload.type);

    } catch (error) {
       // Handle errors (interceptor handles 401/403)
       if (error.response?.status !== 401 && error.response?.status !== 403) {
          console.error("File upload failed", error);
          setError(`File upload failed: ${error.response?.data?.message || error.message}`);
       } else {
            setError(''); // Clear error if auth related
       }
    }
  };

  // Delete the currently selected chat
  const handleDeleteChat = async () => {
     if (!chat?.chatId) return; // No chat selected

     // Confirmation dialog
     const confirmDelete = window.confirm(`Are you sure you want to delete the chat "${chat.chatName}"? This action cannot be undone.`);
     if (!confirmDelete) return;

    try {
      const response = await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
      alert(response.data.message || "Chat deleted successfully!"); // User feedback
      if (onChatDeleted) {
        onChatDeleted(chat.chatId); // Notify parent component (ChatPage)
      }
    } catch (error) {
       // Handle errors (interceptor handles 401/403)
       if (error.response?.status !== 401 && error.response?.status !== 403) {
            console.error("Error deleting chat:", error);
            alert(error.response?.data?.message || "Failed to delete chat.");
       }
    }
  };

  // --- JSX Rendering ---
  return (
    <div className="w-full h-full flex flex-col border-l border-gray-300 bg-gray-50">
      {/* Header Section */}
      <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex justify-between items-center shadow-md flex-shrink-0">
        {chat?.chatName ? (
          <span className="truncate" title={`Chat: ${chat.chatName} (with ${chat.receiverName})`}>
            Chat: {chat.chatName} (with {chat.receiverName})
          </span>
        ) : (
             <span className="italic">No chat selected</span> // Placeholder when no chat is active
        )}
        {/* Show delete button only if a chat is selected */}
        {chat?.chatId && (
          <button
            onClick={handleDeleteChat}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700 text-sm transition duration-150 flex-shrink-0 ml-2"
            title="Delete this chat"
          >
            Delete
          </button>
        )}
      </div>

      {/* Messages Display Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Loading Indicator */}
        {loadingHistory && <p className="text-center text-gray-500 p-4">Loading history...</p>}

        {/* Error Display */}
        {error && !loadingHistory && <p className="text-center text-red-500 p-2 bg-red-100 rounded mb-2">{error}</p>}

        {/* Placeholder when no chat is selected */}
        {!chat?.chatId && !loadingHistory && (
            <p className="text-center text-gray-500 p-10">
                Select a chat from the list or create a new one to start messaging.
            </p>
        )}

        {/* Render Messages */}
        {chat?.chatId && messages.map((msg) => (
          <div
            key={msg.id} // Use the unique message ID from backend
            className={`flex ${msg.sender === currentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg p-2 rounded-lg shadow-sm break-words ${ // Added break-words
                msg.sender === currentUser
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800 border border-gray-200"
              }`}
            >
              {/* Show sender only if it's not the current user */}
              {msg.sender !== currentUser && (
                  <strong className="text-sm block mb-1">{msg.sender}</strong>
              )}

              {/* Render content based on message type */}
              {msg.type === 'TEXT' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}

              {msg.type === 'VOICE' && msg.blobUrl && (
                <audio controls src={msg.blobUrl} className="w-full h-10 mt-1 max-w-[250px]" title={`Voice message from ${msg.sender}`}>
                  Your browser does not support the audio element.
                </audio>
              )}
               {msg.type === 'VOICE' && !msg.blobUrl && (
                    <p className="text-xs text-red-400 italic">{msg.error || 'Could not load audio'}</p>
                )}

               {msg.type === 'FILE_URL' && (
                    <a
                        href={msg.content} // URL stored in content for FILE_URL type
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`View file sent by ${msg.sender}`}
                        className={`text-sm underline ${msg.sender === currentUser ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                        View Attached File
                        {/* TODO: Display filename if available in message payload */}
                    </a>
                )}

              {/* Timestamp */}
              <span className="text-xs opacity-75 block mt-1 text-right" title={new Date(msg.timestamp).toLocaleString()}>
                 {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Only show if a chat is selected */}
      {chat?.chatId && currentUser && (
         <div className="p-2 border-t bg-white space-y-2 flex-shrink-0">
             {/* Text Input and Send/Attach Buttons */}
             <div className="flex items-center space-x-2">
                 <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyPress={handleKeyPress} // Send on Enter
                    className="p-2 flex-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Type a message..."
                    aria-label="Type a message"
                 />
                 {/* Hidden file input */}
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true" // Hide from assistive technology as button triggers it
                 />
                 {/* Attach File Button */}
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-full"
                    title="Attach File"
                    aria-label="Attach File"
                 >
                    <AttachIcon />
                 </button>
                 {/* Send Text Button */}
                 <button
                    onClick={sendTextMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded-lg transition duration-150 disabled:opacity-50 flex-shrink-0"
                    disabled={inputMsg.trim() === ""} // Disable if no text
                    aria-label="Send Message"
                 >
                     Send {/* Or use SendIcon */}
                 </button>
             </div>
              {/* Voice Recorder Component */}
             <VoiceRecorder chat={chat} currentUser={currentUser} />
         </div>
      )}
    </div>
  );
};

export default ChatBox;