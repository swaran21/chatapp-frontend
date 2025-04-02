// src/pages/ChatBox.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import WebSocketService from "../services/WebSocketService";
import VoiceRecorder from "../components/VoiceRecorder";
import { base64ToUint8Array } from "../utils/base64Utils"; // Assuming you have this utility

// --- Icon Components ---
const AttachIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-600"></div>;
// Icon for generic files (or specific ones if you add logic)
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
// --- End Icon Components ---


const ChatBox = ({ chat, currentUser, onChatDeleted }) => {
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [audioBlobUrls, setAudioBlobUrls] = useState({}); // For VOICE messages
    const [isUploading, setIsUploading] = useState(false); // For FILE uploads

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- Memoized Callbacks ---

    // Revoke Blob URLs - Stable
    const revokeAllBlobUrls = useCallback(() => {
        setAudioBlobUrls(currentUrls => {
            const keys = Object.keys(currentUrls);
            if (keys.length > 0) {
                console.log("[Cleanup] Revoking Blob URLs:", keys);
                Object.values(currentUrls).forEach(url => { if (url) URL.revokeObjectURL(url); });
            }
            return {}; // Return the new empty state
        });
    }, []);

    // Process Messages - Handle TEXT, VOICE, and FILE_URL
    const processMessages = useCallback((messagesToProcess) => {
        if (!Array.isArray(messagesToProcess)) {
            console.error("processMessages received non-array:", messagesToProcess);
            return [];
        }
        const newBlobUrls = {}; // Blobs only for VOICE type
        const processed = messagesToProcess.map(msg => {
            if (!msg || !msg.id) {
                console.warn("Skipping invalid message object:", msg);
                return null;
            }
            let processedMsg = { ...msg }; // Shallow copy

            // VOICE: Create Blob URL
            if (processedMsg.type === 'VOICE' && processedMsg.content) {
                try {
                    const audioBytes = base64ToUint8Array(processedMsg.content); // Assumes you have this helper
                    const blob = new Blob([audioBytes], { type: processedMsg.audioMimeType || 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    newBlobUrls[processedMsg.id] = url; // Track blob URL for cleanup
                    processedMsg.blobUrl = url; // Add blobUrl to message object for rendering
                } catch (e) {
                    console.error(`Error creating blob URL for voice message ${processedMsg.id}:`, e);
                    processedMsg.blobUrl = null;
                    processedMsg.error = 'Failed to load audio';
                }
            }
            // FILE_URL: Ensure fileName exists (it should come from backend DTO)
            else if (processedMsg.type === 'FILE_URL') {
                if (!processedMsg.fileName) {
                    // Attempt a basic fallback if backend somehow didn't send it
                    try {
                        const urlParts = processedMsg.content.split('/');
                        processedMsg.fileName = decodeURIComponent(urlParts[urlParts.length - 1] || 'Attached File');
                         console.warn(`FILE_URL message ${processedMsg.id} missing fileName, using fallback: ${processedMsg.fileName}`);
                    } catch (e) {
                         processedMsg.fileName = 'Attached File';
                         console.warn(`Could not extract fallback filename for ${processedMsg.id}`);
                    }
                }
                // No blob URL needed for FILE_URL
            }
            // TEXT: No special processing needed

            return processedMsg;
        }).filter(Boolean); // Remove any nulls from skipping invalid messages

        // Update blob URLs state (only if new ones were created)
        if (Object.keys(newBlobUrls).length > 0) {
             setAudioBlobUrls(prevUrls => ({ ...prevUrls, ...newBlobUrls }));
        }

        return processed;
    }, [base64ToUint8Array]); // Dependency on utility function if defined outside


    // --- Effects ---

    // Effect 1: Fetch History & Setup WebSocket Subscription
    useEffect(() => {
        // Guard clause: No chat selected or user not logged in
        if (!chat?.chatId || !currentUser) {
            if (messages.length > 0) setMessages([]); // Clear messages if chat deselected
            if (error) setError('');
            if (loadingHistory) setLoadingHistory(false);
            revokeAllBlobUrls(); // Ensure blobs are cleaned up if chat deselected
            WebSocketService.unsubscribeFromChat(chat?.chatId); // Ensure unsubscribed if chat deselected
            console.log("[Effect Main] No chat/user. Cleaned up.");
            return;
        }

        // --- Start processing for the selected chat ---
        let isEffectActive = true; // Flag to prevent state updates after unmount/chat change
        let subscription = null;

        console.log(`[Effect Main] Setting up for chat ${chat.chatId}`);
        setLoadingHistory(true);
        setError('');
        setMessages([]); // Clear previous chat messages
        revokeAllBlobUrls(); // Clean up blobs from previous chat

        // 1. Fetch History
        apiClient.get(`/api/chat/${chat.chatId}`)
            .then((res) => {
                if (!isEffectActive) return; // Don't update state if component unmounted or chat changed
                console.log(`[Effect Main - History] Received raw history for chat ${chat.chatId}:`, res.data);
                const historicalMessages = processMessages(res.data || []);
                setMessages(historicalMessages);
            })
            .catch((err) => {
                if (!isEffectActive) return;
                if (err.response?.status !== 401 && err.response?.status !== 403) {
                    console.error(`[Effect Main - History] Error fetching history for chat ${chat.chatId}:`, err);
                    setError("Failed to load message history.");
                } else {
                    setError(''); // Likely handled by auth routing
                    console.warn(`[Effect Main - History] Auth error fetching history for chat ${chat.chatId}:`, err.response?.status);
                }
            })
            .finally(() => {
                if (isEffectActive) setLoadingHistory(false);
            });

        // 2. Setup WebSocket Subscription
        const handleNewMessage = (msg) => {
             // Check if effect is still active AND message is for the *currently viewed* chat
            if (isEffectActive && msg && msg.chatId === chat.chatId) {
                 console.log(`[WebSocket] Processing incoming message for current chat (${chat.chatId}):`, msg);
                 const [processedMsg] = processMessages([msg]); // Process the single new message
                 if (processedMsg) {
                     // Use functional update to avoid stale closures and duplicates
                     setMessages(prevMessages =>
                         prevMessages.some(m => m.id === processedMsg.id) ? prevMessages : [...prevMessages, processedMsg]
                     );
                 } else {
                     console.warn("[WebSocket] Incoming message processing resulted in null:", msg);
                 }
             } else {
                  if (!isEffectActive) console.log("[WebSocket] Ignoring message, effect is inactive.");
                  else if (msg) console.log(`[WebSocket] Ignoring message for different chat (Current: ${chat.chatId}, Received: ${msg.chatId})`);
                  else console.log("[WebSocket] Ignoring invalid message object received.");
             }
        };

        // Connect and subscribe
        WebSocketService.connect()
            .then(() => {
                if (isEffectActive && chat?.chatId) { // Check again before subscribing
                    subscription = WebSocketService.subscribeToChat(chat.chatId, handleNewMessage);
                    if (subscription) {
                        console.log(`[Effect Main - WS] Subscription successful for chat ${chat.chatId}`);
                    } else {
                        console.error(`[Effect Main - WS] Subscription failed for chat ${chat.chatId} even after connect.`);
                        if (isEffectActive) setError("Failed to subscribe to chat updates.");
                    }
                } else {
                    console.log(`[Effect Main - WS] Connect resolved, but effect inactive or chat changed before subscription.`);
                }
            })
            .catch((error) => {
                console.error("[Effect Main - WS] Error during connect/subscribe:", error);
                if (isEffectActive) setError("Real-time connection failed.");
            });

        // Cleanup function for this effect run
        return () => {
            console.log(`[Effect Main Cleanup] Cleaning up for chat ${chat?.chatId}`);
            isEffectActive = false; // Mark effect as inactive
            revokeAllBlobUrls(); // Clean up blobs when chat changes or component unmounts
            if (chat?.chatId) { // Only unsubscribe if chatId was valid for this effect run
                 WebSocketService.unsubscribeFromChat(chat.chatId);
                 console.log(`[Effect Main Cleanup] Unsubscribed from chat ${chat.chatId}`);
            }
        };
        // Dependencies: Rerun when chat ID changes or user changes. Callbacks are stable.
    }, [chat?.chatId, currentUser, processMessages, revokeAllBlobUrls, base64ToUint8Array]);


    // Effect 3: Scroll to Bottom - Runs when messages array changes
    useEffect(() => {
        if(messages.length > 0) { // Only scroll if there are messages
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // --- Event Handlers ---
    const sendTextMessage = () => {
        const text = inputMsg.trim();
        if (text === "" || !chat?.chatId || !currentUser || isUploading) return;
        WebSocketService.sendTextMessage(chat.chatId, currentUser, text);
        setInputMsg("");
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !isUploading) {
            event.preventDefault();
            sendTextMessage();
        }
    };

    const handleFileChange = (event) => {
        console.log("handleFileChange triggered");
        const file = event.target.files?.[0];
        if (file && !isUploading && chat?.chatId && currentUser) {
            console.log("File selected:", file.name, file.type, file.size);
            uploadFile(file);
        } else if (isUploading) {
            console.log("Upload already in progress...");
            setError("Please wait for the current upload to finish.");
        } else if (!chat?.chatId || !currentUser) {
            setError("Cannot upload file: No active chat or user session.");
        }
        // Reset input value ALWAYS to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // --- Upload Function (HTTP POST then WS Send) ---
    const uploadFile = async (fileToUpload) => {
        if (!fileToUpload || !chat?.chatId || !currentUser) {
            console.error("uploadFile called with missing file, chatId, or currentUser");
            return;
        }

        setError('');
        setIsUploading(true);
        console.log(`Starting upload for: ${fileToUpload.name}`);

        const formData = new FormData();
        formData.append("file", fileToUpload);
        // Optional: Append chatId if needed for authorization on backend controller
        // formData.append("chatId", chat.chatId);

        try {
            console.log("Calling POST /api/files/upload");
            // Make sure apiClient is configured correctly (e.g., withCredentials: true if needed)
            const response = await apiClient.post("/api/files/upload", formData, {
                 headers: {
                     'Content-Type': 'multipart/form-data' // Usually set automatically by browser/axios for FormData
                 }
            });

            console.log("Backend HTTP upload response:", response?.data);

            // Validate response from backend controller
            const { fileUrl, fileName, fileType, fileSize } = response?.data || {};
            if (!fileUrl || !fileName || !fileType) {
                 throw new Error("Upload success, but backend response missing required file details (fileUrl, fileName, fileType).");
            }

            console.log(`HTTP Upload successful. URL: ${fileUrl}, Name: ${fileName}, Type: ${fileType}, Size: ${fileSize}`);

            // NOW, send the WebSocket message with the details
            if (WebSocketService.isConnected()) {
                console.log(`Sending FILE_URL message via WS:`, { chatId: chat.chatId, sender: currentUser, fileUrl, fileType, fileName });
                WebSocketService.sendFileUrlMessage(
                    chat.chatId,
                    currentUser,
                    fileUrl,
                    fileType, // Use type from backend response
                    fileName  // Use name from backend response
                );
                // Note: The message appearing in chat comes from the WebSocket BROADCAST
                // after the backend saves the WS message, not directly from this call.
            } else {
                console.error("WebSocket not connected, cannot send file notification message.");
                setError("File uploaded, but could not send chat update. Please check connection or refresh.");
                // Maybe try to queue the message or notify user more prominently?
            }

        } catch (error) {
            console.error("File upload process failed:", error);
            let errorMessage = `Upload failed for ${fileToUpload.name}. `;
            if (error.response) {
                 // Error from backend API (e.g., 400, 401, 500)
                 errorMessage += `Server responded: ${error.response.data?.message || error.response.statusText || 'Unknown server error'} (${error.response.status})`;
                 console.error("Backend error details:", error.response.data);
            } else if (error.request) {
                 // Request made but no response received (network issue, server down)
                 errorMessage += "No response from server. Check network connection.";
                 console.error("No response received:", error.request);
            } else {
                 // Error setting up the request or other client-side issue
                 errorMessage += `Error: ${error.message}`;
            }
            setError(errorMessage);
        } finally {
            console.log("Upload process finished. Setting isUploading to false.");
            setIsUploading(false);
            // Clear the file input ref value again just in case
             if (fileInputRef.current) { fileInputRef.current.value = ""; }
        }
    };


    const handleDeleteChat = async () => {
        if (!chat?.chatId || isUploading) return;
        const confirmDelete = window.confirm(`Are you sure you want to delete the chat "${chat.chatName || 'this chat'}"? This cannot be undone.`);
        if (!confirmDelete) return;

        try {
            // Use query parameter for DELETE as Spring might not easily map RequestBody for DELETE
            const response = await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
            console.log("Delete response:", response);
            alert(response.data.message || "Chat deleted successfully!");
            if (onChatDeleted) onChatDeleted(chat.chatId); // Notify parent component
        } catch (error) {
            console.error("Error deleting chat:", error);
            let errorMsg = "Failed to delete chat.";
            if (error.response) {
                 errorMsg = `Error: ${error.response.data?.message || error.response.statusText || 'Server error'} (${error.response.status})`;
            } else if (error.request) {
                 errorMsg = "Error: No response from server during delete.";
            } else {
                 errorMsg = `Error: ${error.message}`;
            }
            // Avoid showing alert for auth errors if handled globally
            if (error.response?.status !== 401 && error.response?.status !== 403) {
                alert(errorMsg);
            }
        }
    };

    // --- JSX Rendering ---
    return (
        <div className="w-full h-full flex flex-col border-l border-gray-300 bg-gray-50">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex justify-between items-center shadow-md flex-shrink-0">
                {chat?.chatName ? (
                    <span className="truncate" title={`Chat: ${chat.chatName} (with ${chat.receiverName})`}>
                        Chat: {chat.chatName} (with {chat.receiverName})
                    </span>
                ) : (
                    <span className="italic">No chat selected</span>
                )}
                {chat?.chatId && (
                    <button
                        onClick={handleDeleteChat}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700 text-sm transition duration-150 flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete this chat"
                        disabled={isUploading} // Disable delete while uploading
                    >
                        Delete
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingHistory && <p className="text-center text-gray-500 p-4">Loading history...</p>}
                {error && !loadingHistory && (
                    <p className="text-center text-red-600 p-2 bg-red-100 rounded mb-2 text-sm border border-red-300">{error}</p>
                 )}
                {!chat?.chatId && !loadingHistory && !error && <p className="text-center text-gray-500 p-10">Select a chat to start messaging.</p>}

                {/* Render Messages */}
                {chat?.chatId && messages.map((msg) => (
                    <div key={msg.id || `temp-${Math.random()}`} className={`flex ${msg.sender === currentUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg p-2.5 rounded-lg shadow ${msg.sender === currentUser ? "bg-blue-500 text-white" : "bg-white text-gray-800 border"}`}>
                            {/* Sender Name (only if not current user) */}
                            {msg.sender !== currentUser && (
                                <strong className="text-xs font-semibold block mb-1 text-gray-700">{msg.sender}</strong>
                            )}

                            {/* --- Content Rendering based on Type --- */}
                            {msg.type === 'TEXT' && (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            )}

                            {msg.type === 'VOICE' && msg.blobUrl && (
                                <audio controls src={msg.blobUrl} className="w-full h-10 mt-1 max-w-[250px]" title={`Voice message from ${msg.sender}`}>
                                    Your browser does not support the audio element.
                                </audio>
                            )}
                            {msg.type === 'VOICE' && !msg.blobUrl && (
                                <p className="text-xs text-red-400 italic">{msg.error || 'Could not load audio'}</p>
                            )}

                            {/* --- FILE_URL Rendering --- */}
                            {msg.type === 'FILE_URL' && msg.content && (
                                <a
                                    href={msg.content} // The Cloudinary URL
                                    target="_blank" // Open in new tab
                                    rel="noopener noreferrer" // Security best practice
                                    download={msg.fileName || 'download'} // Suggest filename (browser support varies)
                                    title={`Download file: ${msg.fileName || 'Attached File'}`}
                                    className={`flex items-center space-x-1.5 text-sm font-medium underline transition-colors duration-150 ease-in-out ${
                                        msg.sender === currentUser
                                            ? 'text-blue-100 hover:text-white'
                                            : 'text-indigo-600 hover:text-indigo-800'
                                    }`}
                                >
                                    <FileIcon />
                                    {/* Display filename, truncate if long */}
                                    <span className="truncate max-w-[180px] sm:max-w-[220px]">
                                        {msg.fileName || 'Attached File'}
                                    </span>
                                </a>
                            )}
                            {msg.type === 'FILE_URL' && !msg.content && (
                                 <p className="text-xs text-red-400 italic">Error: File URL missing</p>
                            )}
                             {/* --- End Content Rendering --- */}

                            {/* Timestamp */}
                            {msg.timestamp && (
                                <span className="text-xs opacity-70 block mt-1.5 text-right" title={new Date(msg.timestamp).toLocaleString()}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             )}
                        </div>
                    </div>
                ))}
                {/* Element to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Only show if chat is selected and user is logged in */}
            {chat?.chatId && currentUser && (
                <div className="p-3 border-t bg-gray-100 flex-shrink-0">
                    {/* File Upload Progress/Error (if isUploading or specific upload error) */}
                     {isUploading && (
                          <div className="text-xs text-blue-600 mb-1 animate-pulse">Uploading file...</div>
                      )}
                      {/* Maybe add upload-specific error state here if needed */}

                    {/* Main Input Row */}
                    <div className="flex items-center space-x-2">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            aria-hidden="true"
                            disabled={isUploading} // Disable while uploading
                            // Add accept attribute for specific file types if desired
                            // accept="image/*,application/pdf,.doc,.docx,video/*,audio/*"
                        />
                        {/* Attach Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Attach File"
                            aria-label="Attach File"
                            disabled={isUploading} // Disable while uploading
                        >
                            {isUploading ? <LoadingSpinner /> : <AttachIcon />}
                        </button>

                        {/* Text Input */}
                        <input
                            type="text"
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="p-2 flex-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-200"
                            placeholder={isUploading ? "Uploading..." : "Type a message..."}
                            aria-label="Type a message"
                            disabled={isUploading} // Disable while uploading
                        />

                        {/* Send Button */}
                        <button
                            onClick={sendTextMessage}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            disabled={inputMsg.trim() === "" || isUploading} // Disable if no text or uploading
                            aria-label="Send Message"
                        >
                            Send
                        </button>
                    </div>

                    {/* Voice Recorder Row (Conditionally disable visual/interaction if uploading) */}
                    <div className={`mt-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                         <VoiceRecorder chat={chat} currentUser={currentUser} isDisabled={isUploading}/>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBox;