/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1e40af',
        'secondary': '#059669',
        'accent': '#d97706',
        'dark': '#1f2937',
        'light': '#f3f4f6'
      }
    },
  },
  plugins: [],
}
