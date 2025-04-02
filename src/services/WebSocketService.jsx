// src/services/WebSocketService.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// Ensure this matches your Spring Boot WebSocket endpoint (with SockJS)
const SOCKET_URL = "http://localhost:8080/ws-chat";

class WebSocketService {
  constructor() {
    this.client = null;
    this.connectionPromise = null;
    this.subscriptions = {}; // Store subscriptions by chatId { chatId: subscriptionObject }
    console.log("WebSocketService Initialized");
  }

  /**
   * Checks if the STOMP client is currently connected.
   * @returns {boolean} True if connected, false otherwise.
   */
  isConnected() {
    return this.client && this.client.connected;
  }

  /**
   * Establishes or returns the existing connection promise.
   * @returns {Promise<void>} A promise that resolves when connected, or rejects on error.
   */
  connect() {
    // Return existing promise if connection attempt is already in progress or established
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    console.log("[WebSocketService] Attempting to connect...");
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
         // Ensure SockJS URL is correct
        const socket = new SockJS(SOCKET_URL);

        this.client = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000, // Attempt reconnect every 5 seconds
          debug: (str) => console.log("STOMP DEBUG:", str), // Enable STOMP debugging
          connectHeaders: {
            // Add auth headers here if using token-based auth later
          },
          onConnect: () => {
            console.log("[WebSocketService] Connected via STOMP");
            resolve(); // Connection successful
          },
          onStompError: (frame) => {
            const errorMessage = frame.headers['message'] || 'STOMP Protocol Error';
            console.error("[WebSocketService] STOMP Error:", errorMessage, frame.body);
            // Reject connection promise ONLY if error occurs during initial connection phase
            if (!this.isConnected()) {
              this.connectionPromise = null; // Allow retrying connection
              reject(new Error(errorMessage));
            }
            // Handle errors during an active session if needed (e.g., update UI)
          },
          onWebSocketError: (event) => {
            console.error("[WebSocketService] WebSocket Error:", event);
            // Reject connection promise if error happens before connection completes
            if (!this.isConnected()) {
              this.connectionPromise = null; // Allow retrying connection
              reject(new Error("WebSocket connection failed"));
            }
             // Handle errors during an active session (e.g., show "disconnected" message)
          },
          onDisconnect: () => {
            console.log("[WebSocketService] Disconnected");
            // Clear state to allow for fresh connection attempts
            this.connectionPromise = null;
            this.subscriptions = {};
            // Optionally notify UI about disconnection
          }
        });

        // Start the connection process
        this.client.activate();

      } catch (error) {
         console.error("[WebSocketService] Error creating SockJS connection:", error);
         this.connectionPromise = null; // Reset promise on initial error
         reject(error);
      }
    });

    // Handle potential promise rejection globally if needed, or let callers handle it
    this.connectionPromise.catch(error => {
        console.error("[WebSocketService] Connection Promise Rejected:", error.message);
        // Ensure promise is reset on rejection caught here too
        this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  /**
   * Subscribes to a specific chat topic.
   * @param {string|number} chatId The ID of the chat to subscribe to.
   * @param {function(object): void} messageCallback The function to call when a message is received.
   * @returns {import("@stomp/stompjs").StompSubscription | null} The subscription object or null if failed.
   */
  subscribeToChat(chatId, messageCallback) {
    if (!chatId || !messageCallback) {
      console.error("[WebSocketService] Invalid chatId or missing messageCallback for subscription.");
      return null;
    }
    if (!this.isConnected()) {
      console.error("[WebSocketService] Cannot subscribe, WebSocket not connected.");
      // Optionally: Attempt connect then subscribe? Be careful of loops.
      // this.connect().then(() => this.subscribeToChat(chatId, messageCallback)).catch(...)
      return null;
    }

    const topic = `/topic/chat/${chatId}`;

    // Unsubscribe from previous subscription for the same chat ID if it exists
    if (this.subscriptions[chatId]) {
      console.log(`[WebSocketService] Re-subscribing: Unsubscribing previous subscription for chat ${chatId}`);
      try {
        this.subscriptions[chatId].unsubscribe();
      } catch (e) {
        console.warn(`[WebSocketService] Error unsubscribing previous subscription for chat ${chatId}:`, e);
      }
      delete this.subscriptions[chatId]; // Remove old entry
    }

    console.log(`[WebSocketService] Subscribing to topic: ${topic}`);
    try {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          messageCallback(parsedMessage); // Pass parsed message to the callback
        } catch (e) {
          console.error("[WebSocketService] Failed to parse message body:", message.body, e);
        }
      });
      this.subscriptions[chatId] = subscription; // Store the new subscription
      return subscription;
    } catch (error) {
        console.error(`[WebSocketService] Failed to subscribe to ${topic}:`, error);
        return null;
    }
  }

  /**
   * Unsubscribes from a specific chat topic.
   * @param {string|number} chatId The ID of the chat to unsubscribe from.
   */
  unsubscribeFromChat(chatId) {
    if (this.subscriptions[chatId]) {
      console.log(`[WebSocketService] Unsubscribing from chat topic: /topic/chat/${chatId}`);
      try {
        this.subscriptions[chatId].unsubscribe();
      } catch (e) {
         console.warn(`[WebSocketService] Error unsubscribing from chat ${chatId}:`, e);
      }
      delete this.subscriptions[chatId]; // Remove from tracking
    } else {
       console.log(`[WebSocketService] No active subscription found for chat ${chatId} to unsubscribe.`);
    }
  }

  /**
   * Internal helper to publish messages. Checks connection status.
   * @param {string|number} chatId Destination Chat ID.
   * @param {object} payload The message payload object.
   */
  _sendMessage(chatId, payload) {
    if (!this.isConnected()) {
      console.error("[WebSocketService] Cannot send message, WebSocket not connected.");
      // Optionally trigger a reconnect attempt or notify the user
      // this.connect().catch(e => console.error("Reconnect attempt failed:", e));
      return; // Prevent sending if not connected
    }
    try {
        this.client.publish({
            destination: `/app/chat/${chatId}/send`, // Matches backend @MessageMapping
            body: JSON.stringify(payload),
            // headers: { 'content-type': 'application/json' } // Usually not needed for STOMP text body
        });
        console.log("[WebSocketService] Message published:", payload);
    } catch(error) {
        console.error("[WebSocketService] Error publishing message:", error, payload);
    }
  }

  // --- Public methods for sending specific message types ---

  sendTextMessage(chatId, sender, textContent) {
    const payload = {
      chatId,
      sender, // Note: Backend SHOULD verify/override sender based on Authentication
      content: textContent,
      type: "TEXT",
    };
    this._sendMessage(chatId, payload);
  }

  sendVoiceMessage(chatId, sender, base64Content, mimeType) {
    const payload = {
      chatId,
      sender, // Backend should verify/override
      content: base64Content, // Base64 string is the content
      audioMimeType: mimeType,
      type: "VOICE",
    };
    this._sendMessage(chatId, payload);
  }

  /**
   * Sends a notification about an uploaded file.
   * @param {string|number} chatId Chat ID.
   * @param {string} sender Sender username (backend should verify).
   * @param {string} fileUrl The Cloudinary URL of the file.
   * @param {string} fileType The MIME type of the file.
   * @param {string} fileName The original name of the file.
   */
  sendFileUrlMessage(chatId, sender, fileUrl, fileType, fileName) {
    const payload = {
      chatId,
      sender, // Backend should verify/override
      content: fileUrl, // URL is the main content
      fileName: fileName, // <<< Include filename
      fileType: fileType, // Include fileType
      type: "FILE_URL",
    };
    this._sendMessage(chatId, payload);
  }

  /**
   * Disconnects the STOMP client.
   */
  disconnect() {
    if (this.client) {
      try {
          console.log("[WebSocketService] Deactivating STOMP client...");
          this.client.deactivate(); // Triggers onDisconnect callback
      } catch (error) {
          console.error("[WebSocketService] Error during client deactivation:", error);
          // Manually reset state if deactivation fails critically
          this.connectionPromise = null;
          this.subscriptions = {};
          this.client = null;
      }
    } else {
        console.log("[WebSocketService] No active client to disconnect.");
    }
  }
}

// Export a singleton instance
export default new WebSocketService();