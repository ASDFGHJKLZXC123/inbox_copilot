/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/inbox/**/*.{js,ts,jsx,tsx}",
    "./components/inbox/**/*.{js,ts,jsx,tsx}",
  ],
  // Disable preflight so existing dashboard styles are not reset
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        ai: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          600: "#9333ea",
          700: "#7e22ce",
        },
      },
    },
  },
  plugins: [],
};
