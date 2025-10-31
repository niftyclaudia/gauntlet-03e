/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1a1a1a',
          panel: '#2a2a2a',
          border: '#333333',
          hover: '#3a3a3a',
        },
      },
    },
  },
  plugins: [],
}

