import React from "react";
import { Link } from "react-router-dom";
import { motion } from 'framer-motion';

const Home = () => {
  return (
    // Simplified background
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative overflow-hidden
      bg-gradient-to-br from-slate-50 via-white to-sky-100
      transition-colors duration-500 ease-in-out">

        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-indigo-200 to-transparent rounded-full opacity-30 filter blur-3xl animate-pulse"></div>
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-emerald-200 to-transparent rounded-full opacity-30 filter blur-3xl animate-pulse animation-delay-2s"></div>

      <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="relative z-10"
       >
         <h1 className="text-4xl sm:text-6xl font-extrabold mb-5 text-transparent bg-clip-text
            bg-gradient-to-r from-indigo-600 to-blue-500
           ">
             Welcome to ChatApp
         </h1>
         <p className="text-lg mb-10 max-w-xl mx-auto text-slate-600">
             Connect instantly, chat seamlessly. Experience the next level of communication.
         </p>
      </motion.div>

      <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 100 }}
            className="relative z-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
      >
        <Link to="/login">
           <button className="w-full sm:w-auto text-lg font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-100
               bg-gradient-to-r from-indigo-500 to-blue-600 text-white focus:ring-indigo-500 focus:ring-offset-white
            ">
             Login
           </button>
        </Link>
        <Link to="/register">
           <button className="w-full sm:w-auto text-lg font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-100
               bg-gradient-to-r from-emerald-500 to-teal-600 text-white focus:ring-emerald-500 focus:ring-offset-white
            ">
             Register
           </button>
        </Link>
      </motion.div>
    </div>
  );
};

export default Home;