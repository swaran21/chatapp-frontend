import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Welcome from "./pages/Welcome.jsx";
import CreateChat from "./pages/CreateChat.jsx";
import ChatList from "./pages/ChatList.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ChatBox from "./pages/ChatBox.jsx";
import VoiceRecorder from "./components/VoiceRecorder.jsx";
import axios from "axios";


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/chatPage" element={<ChatPage />}/>
        <Route path="/createChat" element={<CreateChat />} />
        <Route path="/chatBox" element={<ChatBox />} />
        <Route path="/chatList" element={<ChatList />} />
        <Route path="/voiceRecorder" element={<VoiceRecorder />}/>
      </Routes>
    </Router>
  );
};

export default App;
