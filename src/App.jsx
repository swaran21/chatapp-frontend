import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from 'framer-motion';
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Welcome from "./pages/Welcome.jsx";
import CreateChat from "./components/CreateChat.jsx";
import ChatList from "./components/ChatList.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ChatBox from "./components/ChatBox.jsx";


const pageVariants = {
  initial: {
    opacity: 0,
    x: "-50px", // Subtle slide in from left
  },
  in: {
    opacity: 1,
    x: 0,
  },
  out: {
    opacity: 0,
    x: "50px", // Subtle slide out to right
  },
};

const pageTransition = {
  type: "tween", // 'tween' or 'spring'
  ease: "anticipate", // smoother easing
  duration: 0.5 // Adjust duration
};

const AnimatedRoutes = () => {
  const location = useLocation(); // Get location for AnimatePresence key

  return (
     <AnimatePresence mode="wait"> {/* wait ensures exit anim completes first */}
          <Routes location={location} key={location.pathname}>
              {/* Wrap each Route's element in motion.div */}
              <Route path="/" element={(
                  <motion.div
                      initial="initial" animate="in" exit="out"
                      variants={pageVariants} transition={pageTransition}
                  > <Home /> </motion.div>
              )}/>
              <Route path="/login" element={(
                   <motion.div
                      initial="initial" animate="in" exit="out"
                      variants={pageVariants} transition={pageTransition}
                  > <Login /> </motion.div>
              )}/>
              <Route path="/register" element={(
                   <motion.div
                      initial="initial" animate="in" exit="out"
                      variants={pageVariants} transition={pageTransition}
                  > <Register /> </motion.div>
               )}/>
              <Route path="/welcome" element={(
                   <motion.div
                      initial="initial" animate="in" exit="out"
                      variants={pageVariants} transition={pageTransition}
                  > <Welcome /> </motion.div>
               )}/>
               <Route path="/chatPage" element={(
                    <motion.div
                      initial="initial" animate="in" exit="out"
                      variants={pageVariants} transition={pageTransition} className="h-full" // Ensure motion div takes height
                   > <ChatPage /> </motion.div>
               )}/>
               {/* Keep direct routes if needed for specific testing/dev, but ChatPage is the main container */}
               <Route path="/createChat" element={(
                  <motion.div><CreateChat /></motion.div>
               )} />
               <Route path="/chatBox" element={(
                  <motion.div><ChatBox /></motion.div>
               )} /> {/* Requires props normally */}
               <Route path="/chatList" element={(
                  <motion.div> <ChatList /></motion.div>
               )} />
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
