// src/services/WebSocketService.jsx
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const SOCKET_URL = "http://localhost:8080/ws-chat";

class WebSocketService {
  constructor() {
    this.client = null;
    this.connectionPromise = null;
    this.subscriptions = {}; // Store subscriptions by chatId
    // Remove this.onMessageReceived if not used globally
    // this.onMessageReceived = null;
  }

  connect(/* Remove onMessageReceivedCallback from here if not needed globally */) {
    // Prevent multiple connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = new SockJS(SOCKET_URL); // Create SockJS connection

      this.client = new Client({
        webSocketFactory: () => socket, // Use SockJS factory
        reconnectDelay: 5000,
        debug: (str) => console.log("STOMP DEBUG:", str),
        connectHeaders: {
          // Headers for auth if needed (usually not for cookie auth)
        },
        // *** Refined onConnect ***
        onConnect: () => {
          console.log("WebSocket Connected via STOMP");
          // We don't need to do anything with a global message handler here.
          // Subscriptions will handle their own callbacks.
          resolve(); // Resolve the promise indicating connection success
        },
        onStompError: (frame) => {
          console.error("STOMP error:", frame.headers['message'], frame.body);
           // Reject the connection promise on STOMP error during connection
           if (!this.client?.connected) { // Check if it was a connection error
              reject(frame);
              this.connectionPromise = null; // Allow retry
           }
          // Handle errors during active session differently if needed
        },
        onWebSocketError: (event) => {
          console.error("WebSocket error:", event);
          // Reject the connection promise if WS fails during connection attempt
          if (!this.client?.connected) {
              reject(event);
               this.connectionPromise = null; // Allow retry
          }
           // Handle errors during active session (e.g., trigger UI update)
        },
        onDisconnect: () => {
          console.log("WebSocket Disconnected");
          // Reset state to allow reconnection attempts
          this.connectionPromise = null;
          this.subscriptions = {}; // Clear subscriptions on disconnect
        }
      });

      // Activate the client to initiate the connection
      this.client.activate();
    });

    return this.connectionPromise;
  }

  // subscribeToChat needs the callback specific to that chat
  subscribeToChat(chatId, messageCallback) {
     if (!messageCallback) {
         console.error(`Subscription attempt for chat ${chatId} without a message callback!`);
         return null; // Or reject a promise if returning one
     }
     if (this.client && this.client.connected) {
        const topic = `/topic/chat/${chatId}`;
        // Unsubscribe if already subscribed to avoid duplicates
        if (this.subscriptions[chatId]) {
            console.log(`Re-subscribing: Unsubscribing from existing topic: ${topic}`);
            this.subscriptions[chatId].unsubscribe();
        }
        console.log(`Subscribing to topic: ${topic}`);
        const sub = this.client.subscribe(topic, (message) => {
            try {
                const parsedMessage = JSON.parse(message.body);
                messageCallback(parsedMessage); // Call the specific callback passed in
            } catch (e) {
                console.error("Failed to parse message body:", message.body, e);
            }
        });
        this.subscriptions[chatId] = sub;
        return sub;
      } else {
        console.error("WebSocket client is not connected. Cannot subscribe.");
         // You could potentially queue the subscription and try again after connect resolves
        return null;
      }
  }

  // ... (unsubscribeFromChat, _sendMessage, sendTextMessage, sendVoiceMessage, sendFileUrlMessage, disconnect methods) ...
   unsubscribeFromChat(chatId) {
        if (this.subscriptions[chatId]) {
             console.log(`Unsubscribing from chat topic: /topic/chat/${chatId}`);
             this.subscriptions[chatId].unsubscribe();
             delete this.subscriptions[chatId];
         }
   }


  _sendMessage(chatId, payload) {
      if (this.client && this.client.connected) {
          this.client.publish({
              destination: `/app/chat/${chatId}/send`,
              body: JSON.stringify(payload),
          });
      } else {
          console.error("Cannot send message, WebSocket not connected.");
           // Maybe add a check here to attempt reconnection if desired
           // this.connect().then(() => this._sendMessage(chatId, payload)).catch(...); // Risky, could loop
      }
  }

  sendTextMessage(chatId, sender, textContent) {
     const payload = { chatId, sender, content: textContent, type: "TEXT" };
     this._sendMessage(chatId, payload);
  }

  sendVoiceMessage(chatId, sender, base64Content, mimeType) {
     const payload = { chatId, sender, content: base64Content, audioMimeType: mimeType, type: "VOICE" };
     this._sendMessage(chatId, payload);
  }

  sendFileUrlMessage(chatId, sender, fileUrl, fileType) {
      const payload = { chatId, sender, content: fileUrl, type: "FILE_URL", /* Add fileType if backend expects it */ };
      this._sendMessage(chatId, payload);
  }


   disconnect() {
        if (this.client) {
            this.client.deactivate();
             // onDisconnect callback handles logging and state reset
        }
   }

}

export default new WebSocketService(); // Export singleton instance