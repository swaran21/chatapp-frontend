// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext'; // Assuming you have this context
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'; // Correct import path

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme(); // Get theme state and toggle function

  // Handle cases where context might not be ready (though ThemeProvider should prevent this)
  if (!toggleTheme) {
    return null; // Or return a disabled button/placeholder
  }

  return (
    <button
      onClick={toggleTheme} // Crucial: Calls the function from context
      className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`} // Tooltip
    >
      {theme === 'light' ? (
        // Moon Icon for switching to Dark Mode
        <MoonIcon className="h-6 w-6 text-indigo-600" />
      ) : (
        // Sun Icon for switching to Light Mode
        <SunIcon className="h-6 w-6 text-yellow-400" />
      )}
    </button>
  );
};

export default ThemeToggle;