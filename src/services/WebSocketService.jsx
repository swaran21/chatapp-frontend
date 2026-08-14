import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8081").replace(/\/$/, "");
const SOCKET_URL = `${API_BASE_URL}/ws-chat`;

class WebSocketService {
    constructor() {
        this.client = null;
        this.connectionPromise = null;
        this.isConnectedState = false;
        this.chatSubscriptions = new Map();
        this.presenceSubscription = null;
        this.presenceHandler = null;
    }

    isConnected() {
        return Boolean(this.client?.connected && this.isConnectedState);
    }

    connect() {
        if (this.isConnected()) return Promise.resolve();
        if (this.connectionPromise) return this.connectionPromise;

        this.connectionPromise = new Promise((resolve, reject) => {
            this.client = new Client({
                webSocketFactory: () => new SockJS(SOCKET_URL),
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                debug: () => {},
                onConnect: () => {
                    this.isConnectedState = true;
                    this._restoreSubscriptions();
                    resolve();
                },
                onStompError: (frame) => {
                    this.isConnectedState = false;
                    reject(new Error(frame.headers?.message || "STOMP connection failed."));
                },
                onWebSocketError: () => {
                    this.isConnectedState = false;
                    reject(new Error("WebSocket connection failed."));
                },
                onWebSocketClose: () => {
                    this.isConnectedState = false;
                },
                onDisconnect: () => {
                    this.isConnectedState = false;
                    this.connectionPromise = null;
                },
            });
            this.client.activate();
        }).finally(() => {
            this.connectionPromise = null;
        });

        return this.connectionPromise;
    }

    async subscribeToChat(chatId, handlers) {
        if (!chatId) return null;
        await this.connect();
        const normalized = typeof handlers === "function" ? { onMessage: handlers } : handlers;
        this.chatSubscriptions.set(String(chatId), { chatId, handlers: normalized || {} });
        return this._subscribeChat(chatId, normalized || {});
    }

    async subscribeToPresence(onPresence) {
        await this.connect();
        if (this.presenceSubscription) this.presenceSubscription.unsubscribe();
        this.presenceHandler = onPresence;
        this.presenceSubscription = this.client.subscribe("/topic/presence", (frame) => {
            onPresence?.(this._parse(frame));
        });
        return this.presenceSubscription;
    }

    _subscribeChat(chatId, handlers) {
        const topics = [
            ["messages", `/topic/chat/${chatId}`, handlers.onMessage],
            ["receipts", `/topic/chat/${chatId}/receipts`, handlers.onReceipt],
            ["typing", `/topic/chat/${chatId}/typing`, handlers.onTyping],
        ];
        const subscriptions = {};
        topics.forEach(([key, topic, callback]) => {
            if (callback) {
                subscriptions[key] = this.client.subscribe(topic, (frame) => callback(this._parse(frame)));
            }
        });
        const entry = this.chatSubscriptions.get(String(chatId));
        if (entry) entry.subscriptions = subscriptions;
        return subscriptions.messages || null;
    }

    _restoreSubscriptions() {
        this.chatSubscriptions.forEach((entry) => this._subscribeChat(entry.chatId, entry.handlers));
        if (this.presenceHandler) {
            this.presenceSubscription = this.client.subscribe("/topic/presence", (frame) => {
                this.presenceHandler?.(this._parse(frame));
            });
        }
    }

    _parse(frame) {
        try { return JSON.parse(frame.body); } catch { return null; }
    }

    unsubscribeFromChat(chatId) {
        const entry = this.chatSubscriptions.get(String(chatId));
        entry?.subscriptions && Object.values(entry.subscriptions).forEach((subscription) => subscription.unsubscribe());
        this.chatSubscriptions.delete(String(chatId));
    }

    _publish(chatId, action, payload) {
        if (!this.isConnected() || !chatId) return false;
        this.client.publish({ destination: `/app/chat/${chatId}/${action}`, body: JSON.stringify(payload || {}) });
        return true;
    }

    sendTextMessage(chatId, _sender, content) {
        return this._publish(chatId, "send", { type: "TEXT", content: content?.trim() });
    }

    sendFileUrlMessage(chatId, _sender, fileUrl, fileType, fileName) {
        return this._publish(chatId, "send", { type: "FILE_URL", content: fileUrl, fileType, fileName });
    }

    editMessage(chatId, messageId, content) { return this._publish(chatId, "edit", { messageId, content }); }
    deleteMessage(chatId, messageId) { return this._publish(chatId, "delete", { messageId }); }
    toggleReaction(chatId, messageId, emoji) { return this._publish(chatId, "react", { messageId, emoji }); }
    markRead(chatId) { return this._publish(chatId, "read", {}); }
    sendTyping(chatId, typing) { return this._publish(chatId, "typing", { typing }); }

    disconnect() {
        this.chatSubscriptions.forEach((entry) => {
            entry.subscriptions && Object.values(entry.subscriptions).forEach((subscription) => subscription.unsubscribe());
        });
        this.chatSubscriptions.clear();
        this.presenceSubscription?.unsubscribe();
        this.presenceSubscription = null;
        this.presenceHandler = null;
        this.client?.deactivate();
        this.client = null;
        this.connectionPromise = null;
        this.isConnectedState = false;
    }
}

export default new WebSocketService();
