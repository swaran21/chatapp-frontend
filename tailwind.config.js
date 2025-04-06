module.exports = {
    darkMode: 'class', // <<< THIS IS ESSENTIAL
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
         // Your custom theme colors are highly recommended here
         colors: {
           'background': {
              light: '#F9FAFB', // gray-50
              dark: '#111827',  // gray-900
           },
           'foreground': {
              light: '#1F2937', // gray-800
              dark: '#E5E7EB',  // gray-200
           },
           'card': {
             light: '#FFFFFF', // white
             dark: '#1F2937',  // gray-800
           },
           // ... add more for borders, primary/accent colors, etc.
         },
         boxShadow: {
            // Example custom subtle glow for dark mode
            'glow-dark': '0 0 15px 0 rgba(45, 212, 191, 0.3)', // Teal glow example
          }
      },
    },
    plugins: [],
  };