import React from "react";
import { Link } from "react-router-dom";
import { motion } from 'framer-motion'; // Import motion

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-sky-100 dark:from-gray-900 dark:via-black dark:to-indigo-900 text-gray-800 dark:text-gray-200 p-4">
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
        >
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500 dark:from-indigo-400 dark:to-pink-400">
                Welcome to YourChat!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Connect instantly, chat seamlessly.</p>
        </motion.div>

      <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 120 }}
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6" // Responsive layout
      >
        <Link to="/login">
          <button className="w-full sm:w-auto text-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out dark:from-blue-400 dark:to-indigo-500 dark:hover:from-blue-500 dark:hover:to-indigo-600">
            Login
          </button>
        </Link>
        <Link to="/register">
          <button className="w-full sm:w-auto text-lg bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out dark:from-green-400 dark:to-teal-500 dark:hover:from-green-500 dark:hover:to-teal-600">
            Register
          </button>
        </Link>
      </motion.div>
       {/* Optional decorative elements */}
        <div className="absolute bottom-5 left-5 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-30 dark:opacity-50 filter blur-xl animate-pulse"></div>
        <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-tl from-purple-400 to-pink-500 rounded-full opacity-30 dark:opacity-50 filter blur-xl animate-pulse animation-delay-2s"></div>
    </div>
  );
};

export default Home;