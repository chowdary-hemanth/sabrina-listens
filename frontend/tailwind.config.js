/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: 'rgba(10, 10, 10, 0.75)',
        'surface-hover': 'rgba(25, 25, 25, 0.85)',
        'surface-active': 'rgba(35, 35, 35, 0.95)',
        border: 'rgba(219, 39, 119, 0.30)', // Dark pink border
        'border-strong': 'rgba(219, 39, 119, 0.75)',
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777', // Primary dark pink
          700: '#be185d', // Deep dark pink
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
        primary: {
          DEFAULT: '#db2777', // Dark pink
          dark: '#be185d',
          hover: '#ec4899',
          glow: 'rgba(219, 39, 119, 0.35)',
        },
      },
      fontFamily: {
        heading: ['Honk', 'cursive', 'sans-serif'],
        description: ['Jost', 'sans-serif'],
        songs: ['"Google Sans Flex"', '"Google Sans"', 'sans-serif'],
        sans: ['Jost', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
