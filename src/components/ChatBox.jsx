// src/components/ChatBox.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import WebSocketService from "../services/WebSocketService";

// Icons (Maybe centralize these later?)
const AttachIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const LoadingSpinner = ({ size = 'h-5 w-5', color = 'border-gray-600 dark:border-gray-300' }) => <div className={`animate-spin rounded-full border-t-2 border-b-2 ${size} ${color}`}></div>;
const FileIcon = ({ className = "h-5 w-5 flex-shrink-0 inline-block mr-1.5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
const SendArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;


const ChatBox = ({ chat, currentUser, onChatDeleted }) => {
    // State hooks (remain the same)
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [wsError, setWsError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // processMessages Logic (remains the same)
     const processMessages = useCallback((messagesToProcess) => {
         // ... same processing logic ...
         if (!Array.isArray(messagesToProcess)) { return []; }
            return messagesToProcess.map(msg => {
                if (!msg || !msg.id || !msg.type) { console.warn("Skipping invalid message structure:", msg); return null; }
                let processedMsg = { ...msg };
                if (processedMsg.type === 'FILE_URL' && !processedMsg.fileName && processedMsg.content) {
                    try { // Robust way to extract filename from URL
                        const url = new URL(processedMsg.content);
                        const pathParts = url.pathname.split('/');
                        processedMsg.fileName = decodeURIComponent(pathParts[pathParts.length - 1] || 'Attached File');
                    } catch (e) {
                         console.error("Error parsing file URL for name:", e);
                        // Fallback using simple split
                        const urlParts = processedMsg.content?.split('/');
                         processedMsg.fileName = decodeURIComponent(urlParts?.[urlParts.length - 1] || 'Attached File');
                     }
                } else if (processedMsg.type === 'FILE_URL' && !processedMsg.content) {
                    console.warn("FILE_URL message missing content:", processedMsg);
                    processedMsg.fileName = processedMsg.fileName || 'Missing File Link';
                }
                // Add timestamp parsing safety
                if (processedMsg.timestamp && !(processedMsg.timestamp instanceof Date)) {
                    try {
                        processedMsg.timestamp = new Date(processedMsg.timestamp);
                         // Check if the date is valid
                        if (isNaN(processedMsg.timestamp.getTime())) {
                             console.warn("Invalid timestamp received:", msg.timestamp);
                             processedMsg.timestamp = null; // Or set to a default?
                         }
                    } catch (e) {
                        console.error("Error parsing timestamp:", e);
                         processedMsg.timestamp = null;
                     }
                }
                return processedMsg;
            }).filter(Boolean); // Remove nulls resulting from errors/skips
     }, []);

     // useEffect for fetching history and WebSocket (logic remains same, add logging)
    useEffect(() => {
         // ... same core logic with checks and cleanup ...
         // Guard clause: No chat selected or user not logged in
        if (!chat?.chatId || !currentUser) {
            if (messages.length > 0) setMessages([]);
            setError(''); setUploadError(''); setWsError('');
            setLoadingHistory(false);
            setIsUploading(false); // Ensure uploading is reset
             // Attempt unsubscribe if there was a chat ID, even if cleanup failed previously
            if (chat?.chatId) { // Check previous state might be needed? No, just the passed chat prop.
                 console.log(`[Effect Cleanup/Guard] Attempting unsubscribe for ${chat.chatId}`);
                 WebSocketService.unsubscribeFromChat(chat.chatId);
             }
             // Reset input ref value in case it had content
             if (textareaRef.current) textareaRef.current.value = "";
             setInputMsg(""); // Clear state too
             console.log("[Effect Guard] No chat/user. Cleaned up state.");
             return;
        }

        // --- Start processing for the selected chat ---
        let isEffectActive = true; // Flag to prevent state updates after unmount/chat change
        let subscription = null;

        console.log(`[ChatBox Effect ${chat.chatId}] Setting up...`);
        setError(''); setUploadError(''); setWsError(''); // Clear errors for new chat
         setMessages([]); // Clear messages immediately for new chat
         setLoadingHistory(true); // Show loading

         // 1. Fetch History
         apiClient.get(`/api/chat/${chat.chatId}`)
            .then((res) => {
                 if (!isEffectActive) { console.log(`[Effect ${chat.chatId} - History] Inactive on receive.`); return; }
                 console.log(`[Effect ${chat.chatId} - History] Received:`, res.data?.length || 0, "messages");
                 const historicalMessages = processMessages(res.data || []);
                 setMessages(historicalMessages);
            })
            .catch((err) => {
                 if (!isEffectActive) { console.log(`[Effect ${chat.chatId} - History] Inactive on error.`); return; }
                  if (err.response?.status !== 401 && err.response?.status !== 403) {
                     console.error(`[Effect ${chat.chatId} - History] Fetch Error:`, err);
                     setError("Failed to load message history.");
                  } else { console.warn(`[Effect ${chat.chatId} - History] Auth error fetching history.`); }
            })
            .finally(() => { if (isEffectActive) setLoadingHistory(false); });

         // 2. Setup WebSocket Subscription
        const handleNewMessage = (msg) => {
             if (isEffectActive && msg && msg.chatId === chat.chatId) {
                 console.log(`[WS ${chat.chatId}] Processing incoming: Type=${msg.type}, ID=${msg.id}`);
                  const [processedMsg] = processMessages([msg]);
                 if (processedMsg) {
                     setMessages(prevMessages =>
                          // Check if message already exists by ID before adding
                          prevMessages.some(m => m.id === processedMsg.id)
                              ? prevMessages
                              : [...prevMessages, processedMsg]
                     );
                      // Clear WS-related error on successful message receipt
                      setWsError(prev => prev ? "" : prev); // Clear only if there was an error
                 } else { console.warn(`[WS ${chat.chatId}] Incoming message processing resulted in null:`, msg); }
             } else {
                 // Optional: Log ignored messages from other chats if needed
                  // if (msg && msg.chatId !== chat.chatId) console.log(`[WS ${chat.chatId}] Ignoring message from different chat: ${msg.chatId}`);
            }
        };

         // Connect and subscribe using the service (error handling inside)
         // Ensure connection before subscribing
         const setupSubscription = async () => {
            try {
                 if (!WebSocketService.isConnected()) {
                      console.log(`[Effect ${chat.chatId} - WS] Not connected, attempting connection...`);
                      await WebSocketService.connect(); // Wait for connection attempt
                 }
                  // Check again after await, connection might have failed or effect became inactive
                  if (!isEffectActive || !chat?.chatId) {
                     console.log(`[Effect ${chat.chatId} - WS] Effect inactive or chat changed after connection attempt.`);
                      return;
                 }
                  if (!WebSocketService.isConnected()) {
                      console.error(`[Effect ${chat.chatId} - WS] Connection failed.`);
                       if (isEffectActive) setWsError("Real-time connection failed."); // Use WS error state
                       return;
                  }

                 // Proceed with subscription
                 subscription = WebSocketService.subscribeToChat(chat.chatId, handleNewMessage);
                  if (subscription) {
                     console.log(`[Effect ${chat.chatId} - WS] Subscription successful.`);
                      setWsError(''); // Clear WS error on successful subscription
                 } else {
                     console.error(`[Effect ${chat.chatId} - WS] Subscription method failed.`);
                      if (isEffectActive) setWsError("Failed to subscribe to chat updates.");
                 }
            } catch (error) {
                console.error(`[Effect ${chat.chatId} - WS] Error during connect/subscribe:`, error);
                 if (isEffectActive) setWsError("Real-time connection failed.");
            }
        };

        setupSubscription(); // Call the async setup

         // Cleanup function for this effect run
        return () => {
            console.log(`[ChatBox Cleanup ${chat?.chatId}] Running cleanup...`);
            isEffectActive = false; // Mark effect as inactive immediately
            if (chat?.chatId) { // Only unsubscribe if chatId was valid *for this effect run*
                console.log(`[ChatBox Cleanup ${chat.chatId}] Unsubscribing from WebSocket.`);
                 WebSocketService.unsubscribeFromChat(chat.chatId);
            }
        };
        // Dependencies: Rerun ONLY when chat ID or current user changes. Callbacks are stable due to useCallback.
     }, [chat?.chatId, currentUser, processMessages]);


    // Scroll to Bottom Effect (remains same)
    useEffect(() => {
         if (messages.length > 0 && !loadingHistory) { // Scroll only when history isn't loading
             messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
         }
    }, [messages, loadingHistory]); // Depend on loadingHistory too

     // Auto-resize textarea effect (remains same)
     useEffect(() => {
         const txtArea = textareaRef.current;
         if (txtArea) {
             txtArea.style.height = 'auto'; // Reset height first
              const scrollHeight = txtArea.scrollHeight;
              // Consider max-height (defined in className)
              txtArea.style.height = `${scrollHeight}px`;
         }
     }, [inputMsg]);

    // Event Handlers (logic same, add logging)
    const sendTextMessage = () => {
        const text = inputMsg.trim();
        if (!text || !chat?.chatId || !currentUser || isUploading || !WebSocketService.isConnected()) {
            if (!WebSocketService.isConnected()) setWsError("Cannot send message: Not connected.");
             console.warn("Send cancelled:", { text, chatId: chat?.chatId, currentUser, isUploading, isConnected: WebSocketService.isConnected() });
            return;
        }
        console.log(`[ChatBox ${chat.chatId}] Sending TEXT:`, text);
        WebSocketService.sendTextMessage(chat.chatId, currentUser, text);
        setInputMsg(""); // Clear input state
        if (textareaRef.current) textareaRef.current.value = ""; // Clear textarea directly if needed
         // Reset height immediately after sending
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setWsError(''); // Clear potential WS connection errors on successful send attempt
    };

    const handleKeyPress = (event) => {
         if (event.key === 'Enter' && !event.shiftKey && !isUploading) {
            event.preventDefault();
            sendTextMessage();
         }
    };

    const handleFileChange = (event) => {
        setError(''); setUploadError(''); // Clear errors
         const file = event.target.files?.[0];
        if (!file) {
            console.log("File selection cancelled.");
             return; // No file selected
         }
        if (isUploading) {
            setUploadError("Please wait for the current upload to finish.");
             return;
        }
         if (!chat?.chatId || !currentUser) {
             setError("Cannot upload file: Select a chat and ensure you are logged in.");
             return;
         }

         console.log(`[ChatBox ${chat.chatId}] File selected:`, file.name, file.type, file.size);
         uploadFile(file); // Start upload process

         // IMPORTANT: Reset file input value to allow selecting the same file again
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
         }
    };

    // Upload File Function (remains largely same, add logging, check WS connection before sending notification)
    const uploadFile = async (fileToUpload) => {
        if (!fileToUpload || !chat?.chatId || !currentUser) return;

        setError(''); setUploadError(''); // Clear errors
        setIsUploading(true);
         console.log(`[ChatBox ${chat.chatId}] Starting HTTP upload for: ${fileToUpload.name}`);

        const formData = new FormData();
        formData.append("file", fileToUpload);

        try {
            const response = await apiClient.post("/api/files/upload", formData, {
                // Add headers if required by backend (e.g., for CSRF)
            });

            console.log(`[ChatBox ${chat.chatId}] HTTP Upload response:`, response?.data);
             const { fileUrl, fileName, fileType } = response?.data || {};

            if (!fileUrl || !fileName || !fileType) {
                setUploadError("Upload incomplete: Server response missing details.");
                throw new Error("Incomplete server response for file upload.");
            }

             console.log(`[ChatBox ${chat.chatId}] HTTP Upload SUCCESS: ${fileName} (${fileType})`);

            // NOW, send WebSocket message notification *if connected*
             if (WebSocketService.isConnected()) {
                console.log(`[ChatBox ${chat.chatId}] Sending FILE_URL message via WS for ${fileName}`);
                 WebSocketService.sendFileUrlMessage(chat.chatId, currentUser, fileUrl, fileType, fileName);
                 setUploadError(''); // Clear upload error on full success
                 setWsError('');     // Clear WS error too
             } else {
                console.error(`[ChatBox ${chat.chatId}] WS disconnected after upload success. Cannot send notification.`);
                 // Keep uploadError maybe? Or use wsError?
                setWsError("File uploaded, but couldn't notify chat (connection issue). Please refresh maybe.");
                 // We could try to re-establish connection and send? More complex.
             }

        } catch (error) {
             console.error(`[ChatBox ${chat.chatId}] File upload process FAILED:`, error);
             let errorMessage = `Upload failed for ${fileToUpload.name}. `;
             if (error.response) {
                errorMessage += `Server: ${error.response.data?.message || error.response.statusText || 'Error'} (${error.response.status})`;
            } else if (error.request) { errorMessage += "No response from server."; }
            else { errorMessage += `Error: ${error.message}`; }
            setUploadError(errorMessage);
        } finally {
             console.log(`[ChatBox ${chat.chatId}] Upload process finished (success or fail).`);
            setIsUploading(false);
             // Clear file input again to be safe
             if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

     // Delete Chat Handler (remains same, improved confirmation and feedback)
    const handleDeleteChat = async () => {
        if (!chat?.chatId || isUploading) return;
         const chatDisplayName = chat.chatName || `chat with ${chat.receiverName}`;
        // Use a more user-friendly confirmation
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${chatDisplayName}"?\n\nAll messages in this chat will be lost for you. The other participant(s) will still see their copy.`);
        if (!confirmDelete) return;

        setError(''); // Clear other errors
        try {
             console.log(`[ChatBox ${chat.chatId}] Attempting to delete chat.`);
            const response = await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
             console.log(`[ChatBox ${chat.chatId}] Delete response:`, response.data);
             // Provide success feedback (maybe use a less intrusive notification system later)
             // alert(response.data.message || "Chat deleted successfully!");
             if (onChatDeleted) onChatDeleted(chat.chatId); // Notify parent
         } catch (error) {
            console.error(`[ChatBox ${chat.chatId}] Error deleting chat:`, error);
             let errorMsg = "Failed to delete chat.";
            if (error.response) { errorMsg = `Error: ${error.response.data?.message || error.response.statusText || 'Server error'} (${error.response.status})`; }
            else if (error.request) { errorMsg = "Error: No response from server."; }
            else { errorMsg = `Error: ${error.message}`; }

             // Show error in the chatbox, avoid alert for common auth issues
             if (error.response?.status !== 401 && error.response?.status !== 403) {
                setError(errorMsg);
                 // Optional: Use alert as fallback for critical delete errors
                 // alert(`Failed to delete chat: ${errorMsg}`);
             } else {
                 // Log auth error, potentially handled globally
                 console.warn(`[ChatBox ${chat.chatId}] Auth error during delete.`);
             }
         }
    };


    // --- JSX Rendering with Theming ---
    return (
        <div className="flex flex-col h-full w-full bg-gray-100 dark:bg-gray-900 border-l border-border-light dark:border-border-dark shadow-inner">
            {/* Header - Enhanced */}
            <div className="flex-shrink-0 p-3 bg-gradient-to-r from-indigo-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white font-semibold flex justify-between items-center shadow-md border-b border-indigo-700 dark:border-gray-700">
                {chat?.chatId ? (
                     <div className="min-w-0 flex-1 mr-2"> {/* Ensure text truncation */}
                        <span className="truncate block text-lg" title={`Chat: ${chat.chatName} (ID: ${chat.chatId})`}>
                             {chat.chatName || "Unnamed Chat"}
                         </span>
                         <span className="text-xs font-normal opacity-80 block truncate">
                            Chatting with: {chat.receiverName || 'Unknown'}
                         </span>
                     </div>
                ) : (
                    <span className="italic text-gray-300 dark:text-gray-500">No Chat Selected</span>
                )}
                {chat?.chatId && (
                     <button
                        onClick={handleDeleteChat}
                         className="flex-shrink-0 bg-red-600/80 text-white px-3 py-1.5 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-70 text-xs transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                         title="Delete this chat permanently"
                         disabled={isUploading}
                     >
                       <TrashIcon /> Delete
                     </button>
                )}
            </div>

            {/* Messages Area - Themed background and scrollbar styles (if possible) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-200/50 dark:bg-gray-800/60 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {/* General Loading/Error States */}
                 {loadingHistory && (
                     <div className="text-center text-muted-light dark:text-muted-dark p-4 animate-pulse">
                         Loading message history...
                    </div>
                 )}
                 {/* Display combined errors nicely */}
                 {(!loadingHistory && (error || wsError)) && (
                     <div className={`text-center p-2 mx-auto max-w-md rounded-md mb-2 text-sm border ${error ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border-orange-300 dark:border-orange-700'}`}>
                          {error || wsError /* Prioritize API error over WS error */}
                     </div>
                 )}
                 {!chat?.chatId && !loadingHistory && !error && !wsError && (
                     <div className="text-center text-muted-light dark:text-muted-dark p-10 italic">
                         Select or create a chat to begin.
                    </div>
                )}


                {/* Render Messages - Themed Bubbles */}
                {chat?.chatId && !loadingHistory && messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === currentUser ? "justify-end" : "justify-start"} group`}>
                        <div
                             className={`relative max-w-[80%] sm:max-w-[70%] md:max-w-[65%] p-3 rounded-xl shadow-md break-words text-sm leading-snug
                                 ${msg.sender === currentUser
                                     ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none"
                                     : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-none"
                                 } transition-all duration-150 ease-out`} // Added transition
                        >
                             {/* Sender Name (only if not current user) */}
                             {msg.sender !== currentUser && (
                                <strong className="text-xs font-bold block mb-1 text-indigo-700 dark:text-indigo-400">
                                     {msg.sender}
                                 </strong>
                            )}

                             {/* Content: TEXT */}
                             {msg.type === 'TEXT' && (
                                <p className="whitespace-pre-wrap">{msg.content}</p> // Allow line breaks
                             )}

                             {/* Content: FILE_URL - Enhanced styling */}
                            {msg.type === 'FILE_URL' && msg.content && (
                                 <a
                                     href={msg.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.fileName || 'download'}
                                    title={`Download: ${msg.fileName || 'Attached File'}`}
                                    className={`flex items-center space-x-1.5 font-medium rounded-md p-2 my-1 transition-colors duration-150 ease-in-out group
                                          ${msg.sender === currentUser
                                            ? 'bg-blue-600/70 hover:bg-blue-700/80 text-blue-100 hover:text-white'
                                             : 'bg-gray-100 dark:bg-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200'
                                          }`}
                                >
                                     <FileIcon className="h-6 w-6 flex-shrink-0" />
                                    <span className="truncate flex-1 min-w-0">
                                        {msg.fileName || 'Attached File'}
                                    </span>
                                     {/* Optional: Add download icon on hover */}
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                     </svg>
                                </a>
                            )}
                             {/* Error state for FILE_URL */}
                             {msg.type === 'FILE_URL' && !msg.content && (
                                 <p className="text-xs text-red-400 dark:text-red-300 italic p-1 bg-red-900/50 rounded mt-1">
                                     Error: File link is missing or invalid.
                                 </p>
                             )}

                             {/* Timestamp - More subtle and maybe on hover? */}
                             {msg.timestamp && msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime()) && (
                                 <span
                                      className={`text-[10px] select-none block mt-1.5 text-right transition-opacity duration-200
                                           ${msg.sender === currentUser
                                             ? 'text-blue-200 opacity-60 group-hover:opacity-100'
                                              : 'text-gray-400 dark:text-gray-500 opacity-60 group-hover:opacity-100'
                                           }`}
                                      title={msg.timestamp.toLocaleString()} // Full timestamp on hover
                                >
                                      {/* Format Time Nicely */}
                                       {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                             )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-px" /> {/* Scroll target */}
            </div>

            {/* Input Area - Enhanced Styling */}
            {chat?.chatId && currentUser && (
                 <div className="flex-shrink-0 p-3 border-t border-border-light dark:border-border-dark bg-gray-200/70 dark:bg-gray-800/80 backdrop-blur-sm space-y-2">
                    {/* Upload Error Display */}
                     {uploadError && (
                         <p className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700 flex items-center gap-1">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                             {uploadError}
                        </p>
                    )}

                     {/* Main Input Row */}
                     <div className="flex items-end space-x-2">
                         {/* Attach Button */}
                         <button
                             onClick={() => !isUploading && fileInputRef.current?.click()}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-center"
                            title="Attach File"
                            aria-label="Attach File"
                             disabled={isUploading}
                         >
                             {isUploading ? <LoadingSpinner color="border-indigo-500 dark:border-indigo-400" /> : <AttachIcon />}
                        </button>
                        {/* Hidden File Input */}
                         <input
                             type="file"
                             ref={fileInputRef}
                             onChange={handleFileChange}
                             className="hidden"
                             aria-hidden="true"
                             disabled={isUploading}
                            // Optional: Add accept attribute
                             // accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                         />

                         {/* Text Input Area - Improved Styling */}
                         <textarea
                            ref={textareaRef}
                            value={inputMsg}
                             onChange={(e) => setInputMsg(e.target.value)}
                             onKeyPress={handleKeyPress}
                            className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed resize-none text-sm leading-snug scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-500"
                            placeholder={isUploading ? "Uploading..." : "Type message (Shift+Enter for new line)"}
                            aria-label="Type a message"
                             disabled={isUploading}
                             rows={1}
                             style={{ maxHeight: '120px', overflowY: 'auto' }} // Limit height
                         />

                         {/* Send Button - Enhanced */}
                         <button
                             onClick={sendTextMessage}
                            className={`bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 dark:from-indigo-500 dark:to-blue-500 dark:hover:from-indigo-600 dark:hover:to-blue-600 text-white font-semibold p-2.5 rounded-lg shadow hover:shadow-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed self-end flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transform disabled:scale-100 hover:scale-105`}
                             disabled={inputMsg.trim() === "" || isUploading || !WebSocketService.isConnected()} // Also disable if not connected
                             aria-label="Send Message"
                             title={!WebSocketService.isConnected() ? "Cannot send: Not connected" : "Send Message"}
                         >
                             <SendArrowIcon />
                         </button>
                    </div>
                 </div>
             )}
        </div>
    );
};

export default ChatBox;