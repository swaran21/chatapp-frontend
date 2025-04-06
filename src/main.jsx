// src/main.jsx (or your app entry point)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Your Tailwind CSS import
import { ThemeProvider } from './context/ThemeContext.jsx'; // Import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider> {/* <<< WRAP HERE */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);