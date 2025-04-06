import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('chatAppTheme');
    if (storedTheme) {
      return storedTheme;
    }
    // Default to system preference if no stored theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark';

    root.classList.remove(isDark ? 'light' : 'dark');
    root.classList.add(theme);

    localStorage.setItem('chatAppTheme', theme);
    console.log(`Theme changed to: ${theme}`); // Debugging
  }, [theme]);

  // Listen for system preference changes (optional but nice)
  useEffect(() => {
     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
     const handleChange = (e) => {
        // Only change if no theme is manually set in localStorage? Or always follow?
        // Let's respect localStorage override. If you want it to follow system:
        // setTheme(e.matches ? 'dark' : 'light');
     };

     mediaQuery.addEventListener('change', handleChange);
     return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Use useMemo to prevent unnecessary re-renders of consumers
   const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};