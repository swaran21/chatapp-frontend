import React, { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "../api/axiosConfig";
import WebSocketService from "../services/WebSocketService";
import {
    ArrowLeftIcon,
    FaceSmileIcon,
    PaperAirplaneIcon as SendArrowIcon,
    PaperClipIcon as AttachIcon,
    TrashIcon,
    ExclamationCircleIcon,
    PencilSquareIcon,
    XMarkIcon,
    CheckIcon,
} from "@heroicons/react/24/solid";
import { DocumentIcon as FileIcon } from "@heroicons/react/24/outline";
import EmojiPicker, { Theme as EmojiTheme, EmojiStyle } from "emoji-picker-react";
import { motion as Motion } from "framer-motion";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const QUICK_REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F62E}"];

const LoadingSpinner = ({ size = "h-5 w-5" }) => (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 ${size}`} />
);

const ChatBox = ({ chat, currentUser, onChatDeleted, onGoBack }) => {
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [wsError, setWsError] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [lastReceipt, setLastReceipt] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editDraft, setEditDraft] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState("");
    const [reactionMenuMessageId, setReactionMenuMessageId] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const typingTimerRef = useRef(null);

    const processMessages = useCallback((items) => {
        if (!Array.isArray(items)) return [];
        return items.filter((message) => message?.id && message?.type).map((message) => {
            const processed = { ...message };
            if (processed.type === "FILE_URL" && !processed.fileName && processed.content) {
                try {
                    const parts = new URL(processed.content).pathname.split("/");
                    processed.fileName = decodeURIComponent(parts.at(-1) || "Attached file");
                } catch {
                    processed.fileName = "Attached file";
                }
            }
            if (processed.timestamp) {
                const date = new Date(processed.timestamp);
                processed.timestamp = Number.isNaN(date.getTime()) ? null : date;
            }
            return processed;
        });
    }, []);

    const mergeMessage = useCallback((incoming) => {
        const [message] = processMessages([incoming]);
        if (!message) return;
        setMessages((current) => {
            const index = current.findIndex((item) => item.id === message.id);
            if (index < 0) return [...current, message];
            const next = [...current];
            next[index] = { ...next[index], ...message };
            return next;
        });
    }, [processMessages]);

    useEffect(() => {
        if (!chat?.chatId || !currentUser) {
            setMessages([]);
            setInputMsg("");
            setError("");
            setWsError("");
            setUploadError("");
            setIsTyping(false);
            return undefined;
        }

        let active = true;
        const chatId = chat.chatId;
        setLoadingHistory(true);
        setMessages([]);
        setError("");
        setWsError("");
        setUploadError("");

        apiClient.get(`/api/chat/${chatId}?limit=50`)
            .then((response) => {
                if (active) setMessages(processMessages(response.data));
            })
            .catch((requestError) => {
                if (active && ![401, 403].includes(requestError.response?.status)) {
                    setError("Failed to load message history.");
                }
            })
            .finally(() => active && setLoadingHistory(false));

        const handleTyping = (event) => {
            if (!active || event?.username === currentUser) return;
            setIsTyping(Boolean(event?.typing));
            if (event?.typing) {
                window.clearTimeout(typingTimerRef.current);
                typingTimerRef.current = window.setTimeout(() => setIsTyping(false), 3000);
            }
        };

        const handleReceipt = (receipt) => {
            if (active) setLastReceipt(receipt);
        };

        WebSocketService.subscribeToChat(chatId, {
            onMessage: (message) => {
                if (active && String(message?.chatId) === String(chatId)) {
                    mergeMessage(message);
                    setWsError("");
                }
            },
            onReceipt: handleReceipt,
            onTyping: handleTyping,
        }).then((subscription) => {
            if (!active) return;
            if (!subscription) setWsError("Real-time connection unavailable. Retry shortly.");
            else WebSocketService.markRead(chatId);
        }).catch(() => active && setWsError("Real-time connection unavailable. Retry shortly."));

        return () => {
            active = false;
            window.clearTimeout(typingTimerRef.current);
            WebSocketService.sendTyping(chatId, false);
            WebSocketService.unsubscribeFromChat(chatId);
        };
    }, [chat?.chatId, currentUser, mergeMessage, processMessages]);

    useEffect(() => {
        if (messages.length && !loadingHistory) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loadingHistory]);

    useEffect(() => {
        if (!showEmojiPicker) return undefined;
        const closePicker = (event) => {
            if (!emojiPickerRef.current?.contains(event.target) && event.target.id !== "emoji-toggle-button") {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", closePicker);
        return () => document.removeEventListener("mousedown", closePicker);
    }, [showEmojiPicker]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputMsg]);

    const sendTyping = (value) => {
        if (!chat?.chatId || !WebSocketService.isConnected()) return;
        const typing = value.trim().length > 0;
        WebSocketService.sendTyping(chat.chatId, typing);
        window.clearTimeout(typingTimerRef.current);
        if (typing) typingTimerRef.current = window.setTimeout(() => WebSocketService.sendTyping(chat.chatId, false), 1500);
    };

    const sendTextMessage = () => {
        const text = inputMsg.trim();
        if (!text || isUploading || !WebSocketService.isConnected()) {
            if (!WebSocketService.isConnected()) setWsError("Cannot send while disconnected.");
            return;
        }
        WebSocketService.sendTextMessage(chat.chatId, currentUser, text);
        WebSocketService.sendTyping(chat.chatId, false);
        setInputMsg("");
        setShowEmojiPicker(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey && !isUploading) {
            event.preventDefault();
            sendTextMessage();
        }
    };

    const showToast = (message) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 2200);
    };

    const editMessage = (message) => {
        setEditingMessage(message);
        setEditDraft(message.content || "");
    };

    const saveEdit = () => {
        const content = editDraft.trim();
        if (!content || !editingMessage || content === editingMessage.content) return;
        WebSocketService.editMessage(chat.chatId, editingMessage.id, content);
        setEditingMessage(null);
        setEditDraft("");
        showToast("Message updated");
    };

    const deleteMessage = (message) => setDeleteTarget(message);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        WebSocketService.deleteMessage(chat.chatId, deleteTarget.id);
        setDeleteTarget(null);
        showToast("Message deleted");
    };

    const toggleReaction = (messageId, emoji) => {
        WebSocketService.toggleReaction(chat.chatId, messageId, emoji);
        setReactionMenuMessageId(null);
    };

    const uploadFile = async (file) => {
        setIsUploading(true);
        setUploadError("");
        const body = new FormData();
        body.append("file", file);
        try {
            const { fileUrl, fileName, fileType } = (await apiClient.post("/api/files/upload", body)).data || {};
            if (!fileUrl || !fileName || !fileType) throw new Error("Upload response is incomplete.");
            if (!WebSocketService.isConnected()) throw new Error("File uploaded, but realtime chat is disconnected.");
            WebSocketService.sendFileUrlMessage(chat.chatId, currentUser, fileUrl, fileType, fileName);
        } catch (uploadException) {
            setUploadError(uploadException.response?.data?.message || uploadException.message || "Upload failed.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setUploadError("File is too large. The maximum allowed size is 10 MB.");
            event.target.value = "";
            return;
        }
        uploadFile(file);
    };

    const handleDeleteChat = async () => {
        if (!window.confirm(`Delete “${chat.chatName || "this chat"}”? This cannot be undone.`)) return;
        try {
            await apiClient.delete(`/api/chat/delete?chatId=${chat.chatId}`);
            onChatDeleted?.(chat.chatId);
        } catch (deleteError) {
            if (![401, 403].includes(deleteError.response?.status)) setError(deleteError.response?.data?.message || "Failed to delete chat.");
        }
    };

    return (
        <div className="relative flex h-full w-full flex-col bg-white/60">
            <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_25px_rgba(38,48,82,0.05)] backdrop-blur-xl">
                <button onClick={onGoBack} className="rounded-full p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-700 md:hidden" aria-label="Back to chat list">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{chat?.chatName || "Select a chat"}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-gray-400">{isTyping ? "Typing…" : `with ${chat?.receiverName || "User"}`}</p>
                </div>
                <span className={`hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline-flex ${WebSocketService.isConnected() ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {WebSocketService.isConnected() ? "Live" : "Reconnecting"}
                </span>
                {chat?.chatId && <button onClick={handleDeleteChat} disabled={isUploading} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/30" aria-label="Delete chat" title="Delete chat"><TrashIcon className="h-4 w-4" /></button>}
            </header>

            <main className="soft-scrollbar relative flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-indigo-50/30 p-4 sm:p-6">
                {loadingHistory && <div className="flex flex-col items-center p-8 text-sm text-slate-500"><LoadingSpinner size="h-8 w-8" /><span className="mt-2">Loading messages…</span></div>}
                {!loadingHistory && (error || uploadError || wsError) && <div className="mx-auto flex max-w-lg items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"><ExclamationCircleIcon className="h-5 w-5 shrink-0" />{error || uploadError || wsError}</div>}
                {!loadingHistory && messages.map((message) => {
                    const own = message.sender === currentUser;
                    return <Motion.div key={message.id} layout initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .22 }} className={`group flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className={`relative max-w-[85%] rounded-2xl p-3 text-sm shadow-[0_8px_20px_rgba(38,48,82,0.08)] sm:max-w-[70%] ${own ? "rounded-br-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "rounded-bl-md border border-slate-200/80 bg-white/90 text-slate-800"}`}>
                            {!own && <strong className="mb-1 block text-xs text-indigo-700 dark:text-indigo-300">{message.sender}</strong>}
                            {message.deleted ? <p className="italic opacity-70">Message deleted</p> : message.type === "TEXT" ? <p className="whitespace-pre-wrap">{message.content}</p> : message.type === "FILE_URL" && message.content ? <a href={message.content} target="_blank" rel="noopener noreferrer" download={message.fileName || "file"} className="flex items-center gap-2 rounded-md bg-black/10 p-1.5 font-medium"><FileIcon className="h-5 w-5 shrink-0" /><span className="truncate">{message.fileName || "Attached file"}</span></a> : <p className="italic opacity-70">Attachment unavailable</p>}
                            {!message.deleted && own && message.type === "TEXT" && <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={() => editMessage(message)} className="rounded p-1 hover:bg-white/20" title="Edit message"><PencilSquareIcon className="h-3.5 w-3.5" /></button><button onClick={() => deleteMessage(message)} className="rounded p-1 hover:bg-white/20" title="Delete message"><TrashIcon className="h-3.5 w-3.5" /></button></div>}
                            {!message.deleted && <div className="relative mt-2 flex flex-wrap items-center gap-1">
                                <button onClick={() => setReactionMenuMessageId((current) => current === message.id ? null : message.id)} className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold opacity-70 transition hover:bg-black/20 hover:opacity-100" aria-label="Add reaction" aria-expanded={reactionMenuMessageId === message.id}>+</button>
                                {message.reactions?.map((reaction) => <button key={`${reaction.username}-${reaction.emoji}`} onClick={() => toggleReaction(message.id, reaction.emoji)} className="rounded-full bg-black/10 px-1.5 text-xs transition hover:bg-black/20" title={`React ${reaction.emoji}`}>{reaction.emoji}</button>)}
                                {reactionMenuMessageId === message.id && <Motion.div initial={{ opacity: 0, y: 5, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`absolute bottom-full z-20 mb-2 flex gap-1 rounded-2xl border border-white/70 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl ${own ? "right-0" : "left-0"}`}>
                                    {QUICK_REACTIONS.map((emoji) => <button key={emoji} onClick={() => toggleReaction(message.id, emoji)} className="rounded-xl px-1.5 py-1 text-lg transition hover:-translate-y-0.5 hover:bg-indigo-50" title={`React ${emoji}`}>{emoji}</button>)}
                                </Motion.div>}
                            </div>}
                            <span className="mt-1 block text-right text-[10px] opacity-60">{message.timestamp?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{message.edited && " · edited"}{own && lastReceipt?.reader === currentUser && " · read"}</span>
                        </div>
                    </Motion.div>;
                })}
                <div ref={messagesEndRef} />
            </main>

            {chat?.chatId && currentUser && <footer className="relative flex-shrink-0 border-t border-slate-200/80 bg-white/80 p-3 backdrop-blur-xl sm:p-4">
                <div className="flex items-end gap-1 sm:gap-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700" aria-label="Attach file">{isUploading ? <LoadingSpinner /> : <AttachIcon className="h-5 w-5" />}</button>
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                    <button id="emoji-toggle-button" onClick={() => setShowEmojiPicker((visible) => !visible)} disabled={isUploading} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700" aria-label="Choose emoji"><FaceSmileIcon className="h-5 w-5" /></button>
                    <textarea ref={textareaRef} value={inputMsg} onChange={(event) => { setInputMsg(event.target.value); sendTyping(event.target.value); }} onKeyDown={handleKeyDown} rows={1} maxLength={2000} placeholder="Write a message…" disabled={isUploading} className="max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                    <button onClick={sendTextMessage} disabled={!inputMsg.trim() || isUploading || !WebSocketService.isConnected()} className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-300/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message"><SendArrowIcon className="h-5 w-5" /></button>
                </div>
                {showEmojiPicker && <div ref={emojiPickerRef} className="absolute bottom-full right-2 z-30 mb-2"><EmojiPicker onEmojiClick={(emoji) => { setInputMsg((value) => value + emoji.emoji); textareaRef.current?.focus(); }} theme={EmojiTheme.LIGHT} emojiStyle={EmojiStyle.NATIVE} lazyLoadEmojis height={350} previewConfig={{ showPreview: false }} /></div>}
            </footer>}
        {toast && <Motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="pointer-events-none absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-xl shadow-slate-900/10">{toast}</Motion.div>}

        {(editingMessage || deleteTarget) && <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center">
            <Motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                    <div><p className="text-sm font-black text-slate-900 dark:text-white">{editingMessage ? "Edit message" : "Delete message?"}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{editingMessage ? "Make your changes and save when ready." : "This message will be removed for everyone."}</p></div>
                    <button onClick={() => { setEditingMessage(null); setDeleteTarget(null); }} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close dialog"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                {editingMessage ? <><textarea autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); saveEdit(); } }} maxLength={2000} rows={4} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditingMessage(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button><button onClick={saveEdit} disabled={!editDraft.trim() || editDraft.trim() === editingMessage.content} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"><CheckIcon className="h-4 w-4" />Save changes</button></div></> : <><div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{deleteTarget?.content}</div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Keep message</button><button onClick={confirmDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700">Delete for everyone</button></div></>}
            </Motion.div>
        </Motion.div>}
        </div>
    );
};

export default ChatBox;
