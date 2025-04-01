// src/components/VoiceRecorder.jsx
import React, { useState, useRef, useEffect } from "react";
import WebSocketService from "../services/WebSocketService";
import { arrayBufferToBase64 } from "../utils/base64Utils"; // Import the helper

const VoiceRecorder = ({ chat, currentUser }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mimeType, setMimeType] = useState(''); // Store the mime type
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Explicitly try common mime types or let the browser decide
       const options = { mimeType: 'audio/webm;codecs=opus' }; // Try webm/opus first
       let recorder;
       try {
            recorder = new MediaRecorder(stream, options);
       } catch (e1) {
            console.warn("audio/webm;codecs=opus not supported, trying audio/ogg");
            try {
                options.mimeType = 'audio/ogg;codecs=opus';
                recorder = new MediaRecorder(stream, options);
            } catch (e2) {
                console.warn("audio/ogg;codecs=opus not supported, using browser default");
                 recorder = new MediaRecorder(stream); // Fallback to browser default
            }
       }


      setMimeType(recorder.mimeType); // Store the actual mimeType being used
      console.log("Using mimeType:", recorder.mimeType);


      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType }); // Use stored mime type
        setAudioBlob(blob);
        audioChunksRef.current = [];
        // Stop the tracks on the stream to turn off the mic indicator
        stream.getTracks().forEach(track => track.stop());
      };

      // Reset state before starting
      setAudioBlob(null);
      audioChunksRef.current = [];

      recorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Error accessing microphone or starting recording:", err);
      alert("Could not start recording. Please ensure microphone access is granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This triggers the onstop event
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) {
        console.error("No audio blob to send.");
        return;
    };

    const reader = new FileReader();
    reader.readAsArrayBuffer(audioBlob); // Read blob as ArrayBuffer

    reader.onloadend = () => {
      try {
          const base64String = arrayBufferToBase64(reader.result); // Convert buffer to Base64
          // Use the new WebSocketService method
          WebSocketService.sendVoiceMessage(
              chat.chatId,
              currentUser, // Sender username (backend should verify/override)
              base64String,
              mimeType // Send the mime type along
          );
          setAudioBlob(null); // Clear the blob after sending attempt
      } catch (error) {
           console.error("Error converting audio to Base64 or sending:", error);
           alert("Failed to send voice message.");
      }
    };

    reader.onerror = (error) => {
        console.error("Error reading audio blob:", error);
        alert("Failed to read recorded audio.");
    };
  };

   // Clean up recorder if component unmounts while recording
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);


  return (
    <div className="mt-2 flex items-center space-x-2 p-2 bg-gray-100 rounded">
      {!isRecording && !audioBlob && (
        <button onClick={startRecording} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition duration-150 ease-in-out">
          Record Voice
        </button>
      )}
      {isRecording && (
        <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-150 ease-in-out animate-pulse">
          Stop Recording...
        </button>
      )}
      {!isRecording && audioBlob && (
        <>
          <button onClick={sendVoiceMessage} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition duration-150 ease-in-out">
            Send Voice
          </button>
          <button onClick={() => setAudioBlob(null)} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded transition duration-150 ease-in-out">
            Discard
          </button>
          {/* Optional: Add a preview player */}
          <audio controls src={URL.createObjectURL(audioBlob)} className="h-10"></audio>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;