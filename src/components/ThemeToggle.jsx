import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  if (!toggleTheme) return null; // Avoid rendering if context not ready

  return (
    <button
      onClick={toggleTheme}
      // Light: Simple hover bg. Dark: Slightly lighter hover bg
      className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-110
                 text-slate-500 hover:bg-slate-200 focus:ring-indigo-500 focus:ring-offset-white // Light styles
                 dark:text-slate-400 dark:hover:bg-gray-700 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-900 // Dark styles
                "
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      {/* Animate icon transition */}
      <div className="relative w-6 h-6">
        <MoonIcon
          className={`absolute top-0 left-0 h-6 w-6 text-indigo-600 transition-opacity duration-300 ease-in-out
                    ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}/>
        <SunIcon
          className={`absolute top-0 left-0 h-6 w-6 text-yellow-400 transition-opacity duration-300 ease-in-out
                     ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}/>
      </div>
    </button>
  );
};

export default ThemeToggle;