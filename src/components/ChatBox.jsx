import React, { useEffect, useState, useRef, useCallback } from "react";
import apiClient from "../api/axiosConfig";
import WebSocketService from "../services/WebSocketService";
import {
    PaperAirplaneIcon as SendArrowIcon,
    PaperClipIcon as AttachIcon,
    TrashIcon,
    ExclamationCircleIcon,
    ArrowLeftIcon,
    FaceSmileIcon
} from '@heroicons/react/24/solid';
import { DocumentIcon as FileIcon } from '@heroicons/react/24/outline';
import EmojiPicker, { Theme as EmojiTheme, EmojiStyle } from 'emoji-picker-react';

const LoadingSpinner = ({ size = 'h-5 w-5', color = 'border-indigo-500 dark:border-indigo-400' }) => (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 ${size} ${color}`}></div>
);

const ChatBox = ({ chat, currentUser, onChatDeleted, onGoBack }) => {
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [wsError, setWsError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    let currentTheme = 'light';
    try {
        const { theme } = useTheme();
        currentTheme = theme || 'light';
    } catch (e) {
        console.warn("ThemeContext not available, defaulting EmojiPicker to light theme.");
    }

    const messagesEndRef = useRef(null); 
    const fileInputRef = useRef(null); 
    const textareaRef = useRef(null); 
    const emojiPickerRef = useRef(null); 


    const processMessages = useCallback((messagesToProcess) => {
        if (!Array.isArray(messagesToProcess)) return [];
        return messagesToProcess.map(msg => {
            if (!msg || !msg.id || !msg.type) {
                console.warn("Skipping invalid message structure:", msg);
                return null; // Skip invalid messages
            }
            let processedMsg = { ...msg };

            // Parse File Name if needed (robustly)
            if (processedMsg.type === 'FILE_URL' && !processedMsg.fileName && processedMsg.content) {
                try {
                    const url = new URL(processedMsg.content);
                    const pathParts = url.pathname.split('/');
                    processedMsg.fileName = decodeURIComponent(pathParts[pathParts.length - 1] || 'Attached_File');
                } catch (e) { 
                    const urlParts = processedMsg.content?.split('/');
                    processedMsg.fileName = decodeURIComponent(urlParts?.[urlParts.length - 1] || 'Attached_File');
                }
            }

            // Parse Timestamp safely (ensure it's a valid Date object)
            if (processedMsg.timestamp && !(processedMsg.timestamp instanceof Date)) {
                try {
                    const date = new Date(processedMsg.timestamp);
                    processedMsg.timestamp = !isNaN(date.getTime()) ? date : null;
                } catch {
                    processedMsg.timestamp = null; // Set to null if parsing fails
                }
            } else if (processedMsg.timestamp instanceof Date && isNaN(processedMsg.timestamp.getTime())) {
                 processedMsg.timestamp = null; // Handle invalid date objects
            }

            return processedMsg;
        }).filter(Boolean);
    }, []);

    // Effect for Fetching History & Handling WebSocket Connection/Subscription
    useEffect(() => {
        // Guard Clause: Exit if no active chat or user
        if (!chat?.chatId || !currentUser) {
            setMessages([]); // Clear messages
            setError(''); setUploadError(''); setWsError(''); // Clear errors
            setLoadingHistory(false); setIsUploading(false); // Reset flags
            setInputMsg(""); if (textareaRef.current) textareaRef.current.value = ""; // Clear input
            setShowEmojiPicker(false); // Also close picker if open
            return;
        }

        let isEffectActive = true;
        setLoadingHistory(true);
        setError(''); setUploadError(''); setWsError(''); setMessages([]); // Reset state for the new chat
        setShowEmojiPicker(false); // Close picker when chat changes

        console.log(`[ChatBox Effect: ${chat.chatId}] Fetching history...`);

        // 1. Fetch Historical Messages
        apiClient.get(`/api/chat/${chat.chatId}`)
            .then(res => {
                if (isEffectActive) {
                    setMessages(processMessages(res.data || []));
                    console.log(`[ChatBox Effect: ${chat.chatId}] History loaded.`);
                }
            })
            .catch(err => {
                // Only set general error if not an auth error (handled elsewhere)
                if (isEffectActive && err.response?.status !== 401 && err.response?.status !== 403) {
                    setError("Failed to load message history.");
                    console.error(`[ChatBox Effect: ${chat.chatId}] History fetch error:`, err);
                } else if (isEffectActive) {
                    console.warn(`[ChatBox Effect: ${chat.chatId}] Auth error loading history.`);
                }
            })
            .finally(() => {
                if (isEffectActive) setLoadingHistory(false);
            });

        // 2. Setup WebSocket Subscription
        const handleNewMessage = (msg) => {
            // Process only if the effect is active and the message is for the current chat
            if (isEffectActive && msg && msg.chatId === chat.chatId) {
                const [processedMsg] = processMessages([msg]);
                if (processedMsg) {
                    setMessages(prevMessages =>
                        // Add message only if it's not already in the state (prevents duplicates)
                        prevMessages.some(m => m.id === processedMsg.id) ? prevMessages : [...prevMessages, processedMsg]
                    );
                    setWsError(prev => prev ? "" : prev); // Clear WS error on receiving a message
                }
            }
        };

        // Async function to handle connection and subscription
        const setupSubscription = async () => {
            if (!isEffectActive) return; // Don't proceed if component changed during async ops
            console.log(`[ChatBox Effect: ${chat.chatId}] Setting up WebSocket...`);
            try {
                // Connect if not already connected (waits for connection attempt)
                if (!WebSocketService.isConnected()) {
                     console.log(`[ChatBox Effect: ${chat.chatId}] Attempting WS connection...`);
                    await WebSocketService.connect();
                }
                 // Re-check activity and connection status after await
                if (!isEffectActive) {
                     console.log(`[ChatBox Effect: ${chat.chatId}] Effect became inactive after WS connect attempt.`); return;
                 }
                if (!WebSocketService.isConnected()) {
                    throw new Error("WebSocket connection failed."); // Could not connect
                }

                // Subscribe to the specific chat topic
                const sub = WebSocketService.subscribeToChat(chat.chatId, handleNewMessage);
                 if (sub) {
                     console.log(`[ChatBox Effect: ${chat.chatId}] Subscription successful.`);
                     if (isEffectActive) setWsError(''); // Clear potential previous WS errors
                 } else {
                     if (isEffectActive) setWsError("Failed to subscribe to real-time updates.");
                     console.error(`[ChatBox Effect: ${chat.chatId}] Subscription method returned null.`);
                 }
            } catch (err) {
                console.error(`[ChatBox Effect: ${chat.chatId}] WebSocket setup error:`, err);
                if (isEffectActive) setWsError("Real-time connection error.");
            }
        };

        setupSubscription(); // Initiate connection/subscription

        // Cleanup Function: Unsubscribe when component unmounts or chat changes
        return () => {
            console.log(`[ChatBox Cleanup: ${chat?.chatId}] Unsubscribing...`);
            isEffectActive = false; // Mark as inactive
            WebSocketService.unsubscribeFromChat(chat.chatId); // Unsubscribe from the specific chat
        };

    }, [chat?.chatId, currentUser, processMessages]); // Dependencies: Re-run when chat, user, or processor changes

    // Effect to Scroll to the bottom when new messages arrive or history loads
    useEffect(() => {
        // Only scroll if there are messages and we are not currently loading history
        if (messages.length > 0 && !loadingHistory) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loadingHistory]);

    // Effect to Auto-resize the textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
            const scrollHeight = textarea.scrollHeight;
            // Apply new height (consider css max-height if you have one)
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [inputMsg]); // Re-run whenever the input message changes

     // Effect for closing Emoji Picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click is outside the picker ref AND not on the toggle button
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                const emojiButton = document.getElementById('emoji-toggle-button');
                if (emojiButton && !emojiButton.contains(event.target)) {
                    setShowEmojiPicker(false);
                }
             }
        };

        if (showEmojiPicker) {
             document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
             document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmojiPicker]); // Only dependent on picker visibility state

    // --- Event Handlers ---

    const sendTextMessage = () => {
        const text = inputMsg.trim();
        // Check conditions before sending
        if (!text || !chat?.chatId || !currentUser || isUploading || !WebSocketService.isConnected()) {
            if (!WebSocketService.isConnected()) {
                setWsError("Cannot send: Not connected.");
            }
            console.warn("Message send cancelled:", { text, conditions_met: !(!text || !chat?.chatId || !currentUser || isUploading || !WebSocketService.isConnected()) });
            return;
        }
        WebSocketService.sendTextMessage(chat.chatId, currentUser, text); // Use service to send
        setInputMsg(""); // Clear input field state
        setWsError(''); // Clear WS error on successful send attempt
        // Immediately reset textarea height after sending
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setShowEmojiPicker(false); // Close emoji picker on send
    };

    // Send message on Enter key (if Shift is not pressed)
    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !isUploading) {
            event.preventDefault(); // Prevent default newline behavior
            sendTextMessage();
        }
    };

    // Handle file selection from the input
    const handleFileChange = (event) => {
        setError(''); setUploadError(''); // Clear previous errors
        const file = event.target.files?.[0];

        if (!file) return; // No file selected

        if (isUploading) {
            setUploadError("Please wait for the current upload to finish.");
            return;
        }
        if (!chat?.chatId || !currentUser) {
            setError("Cannot upload file: No active chat/session."); // Use general error
            return;
        }
        if (file.size > 10 * 1024 * 1024) { // Example: Limit file size to 10MB
             setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB allowed.`);
             if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
             return;
         }

        uploadFile(file); // Initiate upload

        // IMPORTANT: Always reset file input value to allow re-selecting the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setShowEmojiPicker(false); // Close picker if file attached
    };

    // Function to upload file via HTTP POST, then notify via WebSocket
    const uploadFile = async (fileToUpload) => {
        if (!fileToUpload || !chat?.chatId || !currentUser) return;

        setError(''); setUploadError(''); setIsUploading(true);
        console.log(`[ChatBox Upload: ${chat.chatId}] Starting upload for ${fileToUpload.name}`);
        const formData = new FormData();
        formData.append("file", fileToUpload);

        try {
            // POST request to backend endpoint for file upload
            const response = await apiClient.post("/api/files/upload", formData);

            const { fileUrl, fileName, fileType } = response?.data || {};
             // Basic validation of the response
            if (!fileUrl || !fileName || !fileType) {
                throw new Error("Server response missing required file details after upload.");
            }

             console.log(`[ChatBox Upload: ${chat.chatId}] HTTP upload successful: ${fileName}`);

            // If HTTP upload succeeds, send WebSocket notification IF connected
             if (WebSocketService.isConnected()) {
                 WebSocketService.sendFileUrlMessage(chat.chatId, currentUser, fileUrl, fileType, fileName);
                 console.log(`[ChatBox Upload: ${chat.chatId}] WS notification sent.`);
                 setWsError(''); // Clear WS error state on success
                 setUploadError(''); // Clear upload specific error state on success
            } else {
                console.error(`[ChatBox Upload: ${chat.chatId}] File uploaded but WS disconnected. Cannot notify chat.`);
                 setWsError("File sent, but chat notification failed (connection)."); // Set WS specific error
            }

        } catch (error) {
             console.error(`[ChatBox Upload: ${chat.chatId}] Upload process failed:`, error);
             let message = error.response?.data?.message || error.message || `Upload failed for ${fileToUpload.name}.`;
             if (error.response?.status === 413) message = "Upload failed: File is too large.";
            setUploadError(message); // Use specific upload error state
        } finally {
            setIsUploading(false); // Reset upload state
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input again
        }
    };

    // Function to handle deleting the current chat
    const handleDeleteChat = async () => {
        if (!chat?.chatId || isUploading) return; // Prevent delete during upload

        const confirmDelete = window.confirm(
            `Are you sure you want to delete "${chat.chatName || 'this chat'}"?\nThis action cannot be undone.`
        );
        if (!confirmDelete) return;

        setError(''); // Clear general errors before attempting delete
        try {
            await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
            console.log(`[ChatBox Delete: ${chat.chatId}] Chat deleted successfully.`);
            if (onChatDeleted) onChatDeleted(chat.chatId); // Notify parent component
        } catch (error) {
            console.error(`[ChatBox Delete: ${chat.chatId}] Error deleting chat:`, error);
            if (error.response?.status !== 401 && error.response?.status !== 403) {
                setError(error.response?.data?.message || "Failed to delete chat.");
             }
        }
    };

    // Handler for clicking an emoji in the picker
    const onEmojiClick = (emojiData, event) => {
        // Insert emoji at the current cursor position (more complex) or append
        setInputMsg(prevInput => prevInput + emojiData.emoji);
        textareaRef.current?.focus(); // Refocus the textarea
    };

    // Toggle emoji picker visibility
    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    // --- JSX Rendering ---
    return (
        <div className="flex flex-col h-full w-full border-l md:border-l-0 {/* Remove border on medium screens */}
           bg-slate-50 dark:bg-gray-900
           border-slate-200 dark:border-gray-700/50
           transition-colors duration-300 ease-in-out">

             {/* ChatBox Header */}
            <div className="flex-shrink-0 p-3 flex justify-between items-center border-b
                bg-white dark:bg-gray-800
                border-slate-200 dark:border-gray-700
                shadow-sm dark:shadow-none
                transition-colors duration-300 ease-in-out">

                 {/* Back Button - Mobile Only */}
                 <button
                    onClick={onGoBack}
                    className="mr-2 p-1 rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-gray-700 md:hidden" // Only show below 'md'
                    aria-label="Back to chat list"
                    title="Back to list"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                 </button>

                 {/* Chat Title/Info */}
                <div className="min-w-0 flex-1">
                    {chat?.chatId ? (
                         <>
                           <span className="truncate block font-semibold text-slate-800 dark:text-slate-100">{chat.chatName || "Chat"}</span>
                           <span className="text-xs truncate text-slate-500 dark:text-gray-400">with {chat.receiverName || "User"}</span>
                        </>
                     ) : (
                        <span className="italic text-slate-500 dark:text-gray-500">Select a chat</span> // Should ideally not show when chatbox is visible
                     )}
                </div>

                {/* Delete Chat Button */}
                {chat?.chatId && (
                   <button
                       onClick={handleDeleteChat}
                       disabled={isUploading}
                       className="ml-2 flex items-center flex-shrink-0 px-2.5 py-1 rounded-md text-xs transition duration-150 focus:outline-none focus:ring-1 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105
                         bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-300 focus:ring-offset-white
                         dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/60 dark:focus:ring-red-500 dark:focus:ring-offset-gray-800 dark:border dark:border-red-700/50">
                       <TrashIcon className="h-4 w-4 mr-0.5 sm:mr-1" />
                       <span className="hidden sm:inline">Delete</span> {/* Hide text on extra small screens */}
                    </button>
               )}
            </div>


             {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-rounded
               bg-slate-100/50 dark:bg-gray-900
               scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-600
               scrollbar-track-transparent relative"
             >
                {/* Loading, Error, Messages rendering */}
                { loadingHistory && ( <div className="text-center p-6"> <LoadingSpinner size="h-8 w-8" color="border-indigo-500 dark:border-indigo-400" /> <p className="mt-2 text-sm text-slate-500 dark:text-gray-400 animate-pulse">Loading messages...</p> </div> )}
                { !loadingHistory && (error || wsError || uploadError) && ( <div className={`flex items-center justify-center gap-2 text-center p-2 mx-auto max-w-lg rounded-md mb-3 text-sm border font-medium shadow-sm ${error || uploadError ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-200 dark:border-red-600/50' : ''} ${wsError && !error && !uploadError ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-600/50' : ''}`}> <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0"/> <span>{error || uploadError || wsError}</span> </div> )}
                 {chat?.chatId && !loadingHistory && messages.map((msg) => (
                     <div key={msg.id} className={`flex group ${msg.sender === currentUser ? "justify-end" : "justify-start"}`}>
                        <div className={`relative max-w-[80%] sm:max-w-[70%] p-2.5 rounded-xl shadow break-words text-sm leading-snug transition-colors duration-150 ${msg.sender === currentUser ? "bg-blue-500 text-white rounded-br-none dark:bg-gradient-to-br dark:from-indigo-600 dark:to-purple-700 dark:text-slate-100" : "bg-white text-slate-800 border border-slate-200 rounded-bl-none dark:bg-gray-700 dark:text-slate-100 dark:border-gray-600"}`}>
                             {msg.sender !== currentUser && ( <strong className="text-xs font-semibold block mb-0.5 text-indigo-700 dark:text-indigo-400">{msg.sender}</strong> )}
                             {msg.type === 'TEXT' && (<p className="whitespace-pre-wrap">{msg.content}</p>)}
                             {msg.type === 'FILE_URL' && msg.content && ( <a href={msg.content} target="_blank" rel="noopener noreferrer" download={msg.fileName || 'file'} title={`Download: ${msg.fileName}`} className={`flex items-center space-x-2 font-medium rounded-md p-1.5 my-0.5 text-xs sm:text-sm transition-colors duration-150 group ${msg.sender === currentUser ? 'bg-blue-600/80 hover:bg-blue-700/90 text-blue-50 hover:text-white dark:bg-indigo-700/70 dark:hover:bg-indigo-600/80 dark:text-indigo-100' : 'bg-slate-100 hover:bg-slate-200 text-indigo-700 hover:text-indigo-800 dark:bg-gray-600/70 dark:hover:bg-gray-600 dark:text-indigo-300 dark:hover:text-indigo-200'}`}> <FileIcon className="h-5 w-5 sm:h-6 shrink-0 opacity-80 group-hover:opacity-100" /> <span className="truncate flex-1 min-w-0 font-normal">{msg.fileName || 'Attached File'}</span> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 op70 gh:op100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /> </svg> </a> )}
                             {msg.type === 'FILE_URL' && !msg.content && (<p className="text-xs text-red-600 dark:text-red-400 italic flex items-center gap-1"><ExclamationCircleIcon className="h-3 w-3"/> File link missing.</p>)}
                             {msg.timestamp && ( <span className={`text-[10px] select-none block mt-1 text-right opacity-70 group-hover:opacity-90 transition-opacity ${msg.sender === currentUser ? 'text-blue-100 dark:text-indigo-300' : 'text-slate-400 dark:text-gray-400'}`} title={msg.timestamp.toLocaleString()}> {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} </span> )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-px" />
            </div>


             {/* Message Input Area */}
             {chat?.chatId && currentUser && (
                // Relative position needed for emoji picker placement
                <div className="relative flex-shrink-0 p-3 border-t space-y-2
                   bg-slate-100 dark:bg-gray-800
                   border-slate-200 dark:border-gray-700/60
                   transition-colors duration-300 ease-in-out">

                      {/* Upload Error Display */}
                    {uploadError && !error && !wsError && ( <p className="text-xs px-2 py-1 rounded border flex items-center gap-1 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50 font-medium"><ExclamationCircleIcon className="h-4 w-4"/> {uploadError}</p> )}

                    {/* Input Row */}
                    <div className="flex items-end space-x-1 sm:space-x-2"> {/* Reduce space on smallest screens */}
                         {/* Attach Button */}
                        <button onClick={() => !isUploading && fileInputRef.current?.click()} disabled={isUploading}
                           className="p-2 rounded-full disabled:opacity-50 transition-colors self-center focus:outline-none focus:ring-1 ring-inset text-slate-500 hover:text-indigo-600 hover:bg-slate-200 focus:ring-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-700 dark:focus:ring-indigo-400">
                           {isUploading ? <LoadingSpinner size="h-5 w-5" /> : <AttachIcon className="h-5 w-5"/>}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isUploading}/>

                        {/* Emoji Button */}
                        <button id="emoji-toggle-button" onClick={toggleEmojiPicker} disabled={isUploading}
                            className="p-2 rounded-full disabled:opacity-50 transition-colors self-center focus:outline-none focus:ring-1 ring-inset text-slate-500 hover:text-indigo-600 hover:bg-slate-200 focus:ring-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-700 dark:focus:ring-indigo-400">
                           <FaceSmileIcon className="h-5 w-5"/>
                        </button>

                        {/* Text Input */}
                        <textarea ref={textareaRef} value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type message..." disabled={isUploading}
                            rows={1} style={{ maxHeight: '100px' }}
                            className="flex-1 p-2 border rounded-lg text-sm resize-none scrollbar-thin focus:outline-none focus:ring-1 focus:border-transparent transition bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500 scrollbar-thumb-slate-300 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-100 dark:placeholder:text-gray-400 dark:focus:ring-indigo-400 dark:scrollbar-thumb-gray-500 disabled:opacity-60 disabled:bg-slate-200 dark:disabled:bg-gray-600"
                        />

                        {/* Send Button */}
                        <button onClick={sendTextMessage}
                            disabled={inputMsg.trim() === "" || isUploading || !WebSocketService.isConnected()}
                            className={`p-2 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 transition transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 self-end ${(isUploading || inputMsg.trim()==="" || !WebSocketService.isConnected()) ? 'bg-slate-400 dark:bg-gray-600' : 'hover:scale-105 text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800 dark:shadow-none'} `}
                            title={!WebSocketService.isConnected() ? "Disconnected" : "Send Message"}>
                           <SendArrowIcon className="h-5 w-5 text-white"/>
                        </button>
                    </div>

                    {/* Emoji Picker - Absolutely Positioned */}
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-full right-2 sm:right-0 mb-2 z-30" > {/* Adjust right positioning based on screen size if needed */}
                            <EmojiPicker
                               onEmojiClick={onEmojiClick}
                               autoFocusSearch={false}
                                theme={currentTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} // Use derived theme
                               emojiStyle={EmojiStyle.NATIVE}
                               lazyLoadEmojis={true}
                               height={350}
                               // Width can be tricky with absolute; let it size naturally or set fixed/max width
                               // width="100%" // May overflow; better to let it be natural or set fixed width e.g., 320px
                               searchPlaceholder="Search emoji"
                               previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}

                </div> // End Input Area
             )}
        </div> // End Main ChatBox Container
    );
};

export default ChatBox;