/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sherpa: {
          50: '#f6f7f9',
          100: '#eceff2',
          200: '#d5dde3',
          300: '#b0c0cc',
          400: '#839eb0',
          500: '#628197',
          600: '#4e697e',
          700: '#405567',
          800: '#384856',
          900: '#1b252e',
          gold: '#c59b27',
          terracotta: '#c95d3b',
        }
      },
    },
  },
  plugins: [],
};
