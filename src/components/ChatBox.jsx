import React, { useEffect, useState, useRef, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import WebSocketService from "../services/WebSocketService";

const AttachIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-600"></div>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
const SendArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

const ChatBox = ({ chat, currentUser, onChatDeleted }) => {
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState(''); // Separate error for uploads
    const [wsError, setWsError] = useState(''); // Separate error for WebSocket issues
    const [isUploading, setIsUploading] = useState(false); // For file uploads

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const processMessages = useCallback((messagesToProcess) => {
        if (!Array.isArray(messagesToProcess)) { return []; }
        return messagesToProcess.map(msg => {
            if (!msg || !msg.id || !msg.type) { return null; }
            let processedMsg = { ...msg };
            // FILE_URL: Ensure fileName exists
            if (processedMsg.type === 'FILE_URL' && !processedMsg.fileName) {
                try {
                    const urlParts = processedMsg.content?.split('/');
                    processedMsg.fileName = decodeURIComponent(urlParts?.[urlParts.length - 1] || 'Attached File');
                } catch (e) { processedMsg.fileName = 'Attached File'; }
            }
            return processedMsg;
        }).filter(Boolean);
    }, []); 

    useEffect(() => {
        // Guard clause: No chat selected or user not logged in
        if (!chat?.chatId || !currentUser) {
            if (messages.length > 0) setMessages([]);
            setError(''); setUploadError(''); setWsError('');
            setLoadingHistory(false);
            if (chat?.chatId) WebSocketService.unsubscribeFromChat(chat.chatId);
            console.log("[Effect Main] No chat/user. Cleaned up.");
            return;
        }

        // --- Start processing for the selected chat ---
        let isEffectActive = true; // Flag to prevent state updates after unmount/chat change
        let subscription = null;

        console.log(`[Effect Main] Setting up for chat ${chat.chatId}`);
        setLoadingHistory(true);
        setError(''); setUploadError(''); setWsError('');
        setMessages([]);
        // 1. Fetch History
        apiClient.get(`/api/chat/${chat.chatId}`)
            .then((res) => {
                if (!isEffectActive) return;
                console.log(`[Effect Main - History] Received history for chat ${chat.chatId}`);
                const historicalMessages = processMessages(res.data || []);
                setMessages(historicalMessages);
            })
            .catch((err) => {
                if (!isEffectActive) return;
                 if (err.response?.status !== 401 && err.response?.status !== 403) {
                     console.error(`[Effect Main - History] Error fetching history for chat ${chat.chatId}:`, err);
                     setError("Failed to load message history."); // Use general error state
                 } else { console.warn(`[Effect Main - History] Auth error fetching history for chat ${chat.chatId}`); }
            })
            .finally(() => { if (isEffectActive) setLoadingHistory(false); });

        // 2. Setup WebSocket Subscription
        const handleNewMessage = (msg) => {
             // Check if effect is still active AND message is for the *currently viewed* chat
            if (isEffectActive && msg && msg.chatId === chat.chatId) {
                 console.log(`[WS] Processing incoming for chat ${chat.chatId}: Type=${msg.type}, ID=${msg.id}`);
                 const [processedMsg] = processMessages([msg]); // Process the single new message
                 if (processedMsg) {
                     // Use functional update to avoid stale closures and ensure no duplicates
                     setMessages(prevMessages =>
                         prevMessages.some(m => m.id === processedMsg.id) ? prevMessages : [...prevMessages, processedMsg]
                     );
                     setWsError(''); // Clear WS error on successful message
                 } else { console.warn("[WS] Incoming message processing resulted in null:", msg); }
             } else { /* Optional: Log ignored messages */ }
        };

        // Connect and subscribe
        WebSocketService.connect()
            .then(() => {
                if (isEffectActive && chat?.chatId) { // Check again before subscribing
                    subscription = WebSocketService.subscribeToChat(chat.chatId, handleNewMessage);
                    if (subscription) {
                        console.log(`[Effect Main - WS] Subscription successful for chat ${chat.chatId}`);
                        setWsError(''); // Clear WS error on successful subscription
                    } else {
                        console.error(`[Effect Main - WS] Subscription failed for chat ${chat.chatId}`);
                        if (isEffectActive) setWsError("Failed to subscribe to chat updates.");
                    }
                } else { console.log(`[Effect Main - WS] Connect OK, but effect inactive/chat changed.`); }
            })
            .catch((error) => {
                console.error("[Effect Main - WS] Error during connect/subscribe:", error);
                if (isEffectActive) setWsError("Real-time connection failed.");
            });

        // Cleanup function for this effect run
        return () => {
            console.log(`[Effect Main Cleanup] Cleaning up for chat ${chat?.chatId}`);
            isEffectActive = false; // Mark effect as inactive
            if (chat?.chatId) { // Only unsubscribe if chatId was valid for this effect run
                 WebSocketService.unsubscribeFromChat(chat.chatId);
                 console.log(`[Effect Main Cleanup] Unsubscribed from chat ${chat.chatId}`);
            }
        };
    // Dependencies: Rerun ONLY when chat ID or user changes. Callbacks are stable.
    }, [chat?.chatId, currentUser, processMessages]);


    // Effect 2: Scroll to Bottom - Runs when messages array changes
    useEffect(() => {
        if(messages.length > 0) { // Only scroll if there are messages
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

     // Effect 3: Auto-resize textarea based on content
     useEffect(() => {
         if (textareaRef.current) {
             textareaRef.current.style.height = 'auto'; // Reset height
             textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
         }
     }, [inputMsg]); // Re-run when inputMsg changes

    // --- Event Handlers ---
    const sendTextMessage = () => {
        const text = inputMsg.trim();
        if (text === "" || !chat?.chatId || !currentUser || isUploading) return;
        WebSocketService.sendTextMessage(chat.chatId, currentUser, text);
        setInputMsg(""); // Clear input after sending
        // Reset textarea height after sending
        if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    };

    const handleKeyPress = (event) => {
        // Send on Enter unless Shift is pressed (for newline)
        if (event.key === 'Enter' && !event.shiftKey && !isUploading) {
            event.preventDefault(); // Prevent default newline behavior
            sendTextMessage();
        }
    };

    const handleFileChange = (event) => {
        setError(''); setUploadError(''); // Clear errors on new selection
        const file = event.target.files?.[0];
        if (file && !isUploading && chat?.chatId && currentUser) {
            console.log("File selected:", file.name, file.type, file.size);
            uploadFile(file); // Start upload process
        } else if (isUploading) {
            setUploadError("Please wait for the current upload to finish.");
        } else if (!chat?.chatId || !currentUser) {
            setError("Cannot upload file: No active chat or user session.");
        }
        // Reset input value ALWAYS to allow selecting the same file again later
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Upload Function (HTTP POST then WS Send Notification)
    const uploadFile = async (fileToUpload) => {
        if (!fileToUpload || !chat?.chatId || !currentUser) {
            console.error("uploadFile called with missing file, chatId, or currentUser");
            return;
        }

        setError(''); setUploadError(''); // Clear previous errors
        setIsUploading(true);
        console.log(`Starting upload via HTTP POST for: ${fileToUpload.name}`);

        const formData = new FormData();
        formData.append("file", fileToUpload);

        try {
            // Make sure apiClient has withCredentials: true if using session auth
            const response = await apiClient.post("/api/files/upload", formData, {
            });

            console.log("Backend HTTP upload response:", response?.data);

            // Validate response from backend controller
            const { fileUrl, fileName, fileType, fileSize } = response?.data || {};
            if (!fileUrl || !fileName || !fileType) {
                 // Use specific upload error state
                 setUploadError("Upload succeeded, but server response was incomplete.");
                 throw new Error("Backend response missing required file details.");
            }

            console.log(`HTTP Upload successful: ${fileName} (${fileType})`);

            // NOW, send the WebSocket message with the details IF connected
            if (WebSocketService.isConnected()) {
                console.log(`Sending FILE_URL message via WS for ${fileName}`);
                WebSocketService.sendFileUrlMessage( chat.chatId, currentUser, fileUrl, fileType, fileName );
                setUploadError(''); // Clear upload error on success
            } else {
                console.error("WebSocket not connected after successful upload. Cannot send file notification message.");
                setWsError("File uploaded, but chat update failed (connection issue)."); // Use WS error state
            }

        } catch (error) {
            console.error("File upload process failed:", error);
            let errorMessage = `Upload failed for ${fileToUpload.name}. `;
            if (error.response) {
                 errorMessage += `Server: ${error.response.data?.message || error.response.statusText || 'Error'} (${error.response.status})`;
            } else if (error.request) { errorMessage += "No response from server."; }
            else { errorMessage += `Error: ${error.message}`; }
            setUploadError(errorMessage); // Set upload-specific error
        } finally {
            console.log("Upload process finished.");
            setIsUploading(false);
            // Clear the file input ref value again just in case
             if (fileInputRef.current) { fileInputRef.current.value = ""; }
        }
    };


    const handleDeleteChat = async () => {
        if (!chat?.chatId || isUploading) return; // Prevent delete during upload
        const confirmDelete = window.confirm(`Are you sure you want to delete the chat "${chat.chatName || 'this chat'}"? This action cannot be undone.`);
        if (!confirmDelete) return;

        setError(''); // Clear general errors
        try {
            const response = await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
            console.log("Delete response:", response);
            alert(response.data.message || "Chat deleted successfully!"); // Provide feedback
            if (onChatDeleted) onChatDeleted(chat.chatId); // Notify parent component
        } catch (error) {
            console.error("Error deleting chat:", error);
            let errorMsg = "Failed to delete chat.";
            if (error.response) { errorMsg = `Error: ${error.response.data?.message || error.response.statusText || 'Server error'} (${error.response.status})`; }
            else if (error.request) { errorMsg = "Error: No response from server."; }
            else { errorMsg = `Error: ${error.message}`; }
            // Avoid showing alert for auth errors if handled globally by routing
            if (error.response?.status !== 401 && error.response?.status !== 403) {
                setError(errorMsg); // Show error in the chatbox general error area
            }
        }
    };

    // --- JSX Rendering ---
    return (
        <div className="w-full h-full flex flex-col border-l border-gray-300 bg-gray-100">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold flex justify-between items-center shadow-md flex-shrink-0">
                {chat?.chatName ? (
                    <span className="truncate" title={`Chat: ${chat.chatName} (with ${chat.receiverName})`}>
                        {chat.chatName} <span className="text-sm font-normal opacity-80">(with {chat.receiverName})</span>
                    </span>
                ) : (
                    <span className="italic text-gray-200">No chat selected</span>
                )}
                {chat?.chatId && (
                    <button
                        onClick={handleDeleteChat}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 text-sm transition duration-150 flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete this chat"
                        disabled={isUploading} // Disable delete while uploading
                    >
                        Delete
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50">
                {/* Loading/Error States */}
                 {loadingHistory && <p className="text-center text-gray-500 p-4 animate-pulse">Loading history...</p>}
                 {error && !loadingHistory && (<p className="text-center text-red-600 p-2 bg-red-100 rounded mb-2 text-sm border border-red-300">{error}</p>)}
                 {wsError && (<p className="text-center text-orange-600 p-2 bg-orange-100 rounded mb-2 text-sm border border-orange-300">{wsError}</p>)}
                 {!chat?.chatId && !loadingHistory && !error && !wsError && <p className="text-center text-gray-500 p-10">Select or create a chat to begin.</p>}

                {/* Render Messages */}
                {chat?.chatId && messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === currentUser ? "justify-end" : "justify-start"}`}>
                        <div className={`relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg p-2.5 rounded-lg shadow-md break-words ${msg.sender === currentUser ? "bg-blue-500 text-white" : "bg-white text-gray-900 border border-gray-200"}`}>
                            {/* Sender Name (only if not current user) */}
                            {msg.sender !== currentUser && (
                                <strong className="text-xs font-semibold block mb-1 text-indigo-700">{msg.sender}</strong>
                            )}

                            {/* Content: TEXT */}
                            {msg.type === 'TEXT' && (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Content: FILE_URL */}
                            {msg.type === 'FILE_URL' && msg.content && (
                                <a
                                    href={msg.content} // The Cloudinary URL
                                    target="_blank" // Open in new tab
                                    rel="noopener noreferrer" // Security best practice
                                    download={msg.fileName || 'download'} // Suggest filename
                                    title={`Download: ${msg.fileName || 'Attached File'}`}
                                    className={`flex items-center space-x-1.5 text-sm font-medium underline transition-colors duration-150 ease-in-out ${msg.sender === currentUser ? 'text-blue-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}
                                >
                                    <FileIcon />
                                    <span className="truncate max-w-[180px] sm:max-w-[220px]">
                                        {msg.fileName || 'Attached File'}
                                    </span>
                                </a>
                            )}
                            {/* Error state for FILE_URL */}
                             {msg.type === 'FILE_URL' && !msg.content && (
                                <p className="text-xs text-red-500 italic">Error: File link is missing</p>
                             )}

                            {/* Timestamp */}
                             {msg.timestamp && (
                                <span
                                    className={`text-[10px] block mt-1.5 text-right ${msg.sender === currentUser ? 'opacity-70' : 'text-gray-500 opacity-80'}`}
                                    title={new Date(msg.timestamp).toLocaleString()}
                                >
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             )}
                        </div>
                    </div>
                ))}
                {/* Element to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {chat?.chatId && currentUser && (
                <div className="p-3 border-t bg-gray-200 flex-shrink-0 space-y-2">
                    {/* Upload Error Display */}
                    {uploadError && (<p className="text-xs text-red-600 p-1 bg-red-100 rounded border border-red-300">{uploadError}</p>)}

                    {/* Row 1: Text Input & File Attach/Send */}
                     <div className="flex items-end space-x-2">
                         {/* Attach Button */}
                         <button
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className="p-2 text-gray-600 hover:text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-center"
                            title="Attach File"
                            aria-label="Attach File"
                            disabled={isUploading}
                         >
                             {isUploading ? <LoadingSpinner /> : <AttachIcon />}
                         </button>
                         {/* Hidden File Input */}
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            aria-hidden="true"
                            disabled={isUploading}
                         />

                         {/* Text Input Area */}
                         <textarea
                            ref={textareaRef}
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="p-2 flex-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-300 disabled:cursor-not-allowed resize-none text-sm leading-snug"
                            placeholder={isUploading ? "Uploading file..." : "Type a message (Shift+Enter for newline)..."}
                            aria-label="Type a message"
                            disabled={isUploading}
                            rows={1}
                            style={{ maxHeight: '100px', overflowY: 'auto' }} // Limit height, enable scroll
                         />

                        {/* Send Button */}
                        <button
                            onClick={sendTextMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed self-end flex items-center"
                            disabled={inputMsg.trim() === "" || isUploading}
                            aria-label="Send Message"
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
