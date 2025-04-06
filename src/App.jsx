import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from 'framer-motion';
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Welcome from "./pages/Welcome.jsx";
import ChatPage from "./pages/ChatPage.jsx";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  in: { opacity: 1, scale: 1 },
  out: { opacity: 0, scale: 1.02 },
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut", // Smoother ease
  duration: 0.4       // Faster transition
};

const AnimatedRoutes = () => {
    const location = useLocation();
    return (
       <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                 {/* Home */}
                 <Route path="/" element={
                    <motion.div
                        initial="initial" animate="in" exit="out"
                        variants={pageVariants} transition={pageTransition}
                        className="w-full h-full" // Ensure motion div fills space
                     > <Home /> </motion.div>
                 }/>
                 {/* Login */}
                 <Route path="/login" element={
                     <motion.div
                        initial="initial" animate="in" exit="out"
                        variants={pageVariants} transition={pageTransition}
                         className="w-full h-full"
                     > <Login /> </motion.div>
                 }/>
                 {/* Register */}
                 <Route path="/register" element={
                     <motion.div
                        initial="initial" animate="in" exit="out"
                        variants={pageVariants} transition={pageTransition}
                         className="w-full h-full"
                     > <Register /> </motion.div>
                 }/>
                 {/* Welcome */}
                 <Route path="/welcome" element={
                     <motion.div
                        initial="initial" animate="in" exit="out"
                        variants={pageVariants} transition={pageTransition}
                         className="w-full h-full"
                     > <Welcome /> </motion.div>
                 }/>
                 {/* Chat Page - Main application area */}
                 <Route path="/chatPage" element={
                      <motion.div
                        initial="initial" animate="in" exit="out"
                        variants={pageVariants} transition={pageTransition}
                         className="w-full h-screen" // Needs specific height for chat layout
                     > <ChatPage /> </motion.div>
                 }/>
            </Routes>
        </AnimatePresence>
    );
};


const App = () => {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
};

export default App;