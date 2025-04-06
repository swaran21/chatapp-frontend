import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"; // Fallback
const SOCKET_ENDPOINT = "/ws-chat"; // WebSocket specific path
const SOCKET_URL = `${API_BASE_URL}${SOCKET_ENDPOINT}`;

class WebSocketService {
    constructor() {
        this.client = null;
        this.connectionPromise = null;
        this.subscriptions = {};
        console.log("WebSocketService Initialized");
        this.isConnectedState = false;
    }

    isConnected() {
        const stompConnected = this.client && this.client.connected;
        return stompConnected && this.isConnectedState;    
    }

    connect() { 
         if (this.connectionPromise) { return this.connectionPromise; }
         console.log("[WebSocketService] Attempting NEW connection...");
         this.isConnectedState = false;
         this.connectionPromise = new Promise((resolve, reject) => {
             try {
                 const socket = new SockJS(SOCKET_URL);
                 this.client = new Client({
                     webSocketFactory: () => socket, reconnectDelay: 5000, heartbeatIncoming: 4000, heartbeatOutgoing: 4000,
                     debug: (str) => console.log("STOMP DEBUG:", str),
                     onConnect: () => { console.log("✅ [WebSocketService] STOMP Connected!"); this.isConnectedState = true; resolve(); },
                     onStompError: (frame) => { console.error("❌ [WebSocketService] STOMP Error:", frame.headers['message'], frame.body); this.isConnectedState = false; if (this.connectionPromise) { this.connectionPromise = null; reject(new Error(`STOMP Error`)); } },
                     onWebSocketError: (event) => { console.error("❌ [WebSocketService] WebSocket Error:", event); this.isConnectedState = false; if (this.connectionPromise) { this.connectionPromise = null; reject(new Error("WebSocket Error")); } },
                     onWebSocketClose: (event) => { console.warn(`🔌 [WebSocketService] WebSocket Closed! Code: ${event?.code}`); this.isConnectedState = false; this.subscriptions = {}; },
                     onDisconnect: () => { console.log("🔌 [WebSocketService] STOMP Client Deactivated"); this.isConnectedState = false; this.connectionPromise = null; this.subscriptions = {}; }
                 });
                 console.log("[WebSocketService] Activating STOMP client..."); this.client.activate();
             } catch (error) { console.error("❌ [WebSocketService] Connect infrastructure error:", error); this.isConnectedState = false; this.connectionPromise = null; reject(error); }
         });
         this.connectionPromise.catch(error => { console.error("❌ [WebSocketService] Connection Promise Rejected:", error.message); this.isConnectedState = false; this.connectionPromise = null; });
         return this.connectionPromise;
    }

    /**
     * Subscribes to a specific chat topic. Handles reconnecting if not connected.
     * @param {string|number} chatId The ID of the chat to subscribe to.
     * @param {function(object): void} messageCallback The function to call with the parsed message DTO.
     * @returns {import("@stomp/stompjs").StompSubscription | null} The subscription object or null if failed.
     */
    subscribeToChat(chatId, messageCallback) {
        if (!chatId || typeof messageCallback !== 'function') {
            console.error("[WS Subscribe Error] Invalid chatId or missing messageCallback.");
            return null;
        }
        if (!this.isConnected()) {
            console.warn("[WebSocketService] Not connected. Attempting connect before subscribing...");
            // Attempt connect then subscribe. Chain the promise.
            return this.connect()
                .then(() => {
                     // Check connection again after promise resolves, might have failed
                     if (!this.isConnected()) {
                          console.error("[WS Subscribe Error] Connection attempt failed before subscribing.");
                          return null;
                     }
                     return this._performSubscription(chatId, messageCallback); // Separate helper
                })
                .catch(err => {
                    console.error("[WS Subscribe Error] Failed during connect/subscribe attempt:", err);
                    return null; // Return null on failure
                });
        }
        // Already connected, proceed directly
        return this._performSubscription(chatId, messageCallback);
    }

    /** Internal helper to perform the actual subscription */
    _performSubscription(chatId, messageCallback) {
        const topic = `/topic/chat/${chatId}`;
        // Unsubscribe from previous subscription for the same chat ID if it exists
        if (this.subscriptions[chatId]) {
            console.log(`[WS] Re-subscribing: Unsubscribing previous for chat ${chatId}`);
            try { this.subscriptions[chatId].unsubscribe(); }
            catch (e) { console.warn(`[WS] Error unsubscribing previous sub for chat ${chatId}:`, e); }
            delete this.subscriptions[chatId]; // Remove old entry
        }

        console.log(`[WS] Subscribing to topic: ${topic}`);
        try {
            const subscription = this.client.subscribe(topic, (message) => {
                try {
                    const parsedMessage = JSON.parse(message.body);
                    // Basic validation of parsed message structure
                    if (parsedMessage && parsedMessage.id && parsedMessage.type) {
                         messageCallback(parsedMessage); // Pass parsed message DTO to the callback
                    } else {
                         console.warn("[WS] Received message with unexpected structure:", parsedMessage);
                    }
                } catch (e) {
                    console.error("[WS] Failed to parse message body:", message.body, e);
                }
            });
            this.subscriptions[chatId] = subscription; // Store the new subscription
            console.log(`[WS] Subscription successful for chat ${chatId}`);
            return subscription;
        } catch (error) {
            console.error(`[WS] Failed to subscribe to ${topic}:`, error);
            return null;
        }
    }


    /**
     * Unsubscribes from a specific chat topic.
     * @param {string|number} chatId The ID of the chat to unsubscribe from.
     */
    unsubscribeFromChat(chatId) {
        if (!chatId) return; // Prevent errors if chatId is invalid
        if (this.subscriptions[chatId]) {
            console.log(`[WS] Unsubscribing from chat topic: /topic/chat/${chatId}`);
            try {
                this.subscriptions[chatId].unsubscribe();
            } catch (e) {
                console.warn(`[WS] Error unsubscribing from chat ${chatId}:`, e);
            }
            delete this.subscriptions[chatId]; // Remove from tracking
        } else {
            // console.log(`[WS] No active subscription found for chat ${chatId} to unsubscribe.`);
        }
    }

    /**
     * Internal helper to publish messages. Checks connection status.
     * @param {string|number} chatId Destination Chat ID.
     * @param {object} payload The message payload object. Must include 'type'.
     */
    _sendMessage(chatId, payload) {
        if (!this.isConnected()) {
            console.error("WS Send Error: Not connected. Cannot send message.");
            return; // Prevent sending if not connected
        }
        if (!chatId) {
             console.error("WS Send Error: Missing chatId.");
             return;
        }
         if (!payload || typeof payload !== 'object' || !payload.type) {
             console.error("WS Send Error: Invalid or missing payload/type.", payload);
             return;
         }

        try {
            const destination = `/app/chat/${chatId}/send`; // Matches backend @MessageMapping
            this.client.publish({
                destination: destination,
                body: JSON.stringify(payload),
            });
            console.log(`[WS] Message published to ${destination} (Type: ${payload.type})`);
        } catch(error) {
            console.error("[WS] Error publishing message:", error, payload);
        }
    }


    sendTextMessage(chatId, sender, textContent) {
        if (!textContent || textContent.trim() === "") {
             console.warn("WS Send Warn: Attempted to send empty text message.");
             return;
        }
        const payload = {
            chatId: chatId,
            sender: sender,
            content: textContent,
            type: "TEXT",
        };
        this._sendMessage(chatId, payload);
    }

    /**
     * Sends a notification about an uploaded file via WebSocket.
     * This is called *after* the file is successfully uploaded via HTTP POST.
     * @param {string|number} chatId Chat ID.
     * @param {string} sender Sender username (backend should verify).
     * @param {string} fileUrl The Cloudinary URL of the file.
     * @param {string} fileType The MIME type of the file.
     * @param {string} fileName The original (or sanitized) name of the file.
     */
    sendFileUrlMessage(chatId, sender, fileUrl, fileType, fileName) {
        // Add validation checks
        if (!fileUrl) { console.error("WS Send Error (FILE_URL): Missing fileUrl."); return; }
        if (!fileName) { console.error("WS Send Error (FILE_URL): Missing fileName."); return; }
        if (!fileType) { console.error("WS Send Error (FILE_URL): Missing fileType."); return; }

        const payload = {
            chatId: chatId,
            sender: sender, // Backend should verify/override
            content: fileUrl,   // URL is the main content for FILE_URL type
            fileName: fileName, // <<< Crucial: Include filename
            fileType: fileType, // <<< Crucial: Include fileType
            type: "FILE_URL",   // <<< Set correct type
        };
        this._sendMessage(chatId, payload);
    }

    /**
     * Disconnects the STOMP client gracefully.
     */
    disconnect() {
        if (this.client && this.client.active) { // Check if active before deactivating
            try {
                console.log("[WebSocketService] Deactivating STOMP client...");
                // Unsubscribe all before disconnecting
                 Object.keys(this.subscriptions).forEach(chatId => {
                     this.unsubscribeFromChat(chatId);
                 });
                this.client.deactivate(); // Triggers onDisconnect callback if connected
            } catch (error) {
                console.error("[WebSocketService] Error during client deactivation:", error);
            }
        } else {
            // console.log("[WebSocketService] No active client to disconnect.");
        }
        // Explicitly clear state regardless of client status
        this.connectionPromise = null;
        this.subscriptions = {};
        this.client = null; // Ensure client reference is removed
        console.log("[WebSocketService] Disconnect process finished.");
    }
}

// Export a singleton instance
const webSocketServiceInstance = new WebSocketService();
export default webSocketServiceInstance;