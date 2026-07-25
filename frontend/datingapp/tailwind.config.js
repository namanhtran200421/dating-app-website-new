/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{html,ts}", "./node_modules/preline/preline.js"],
  theme: {
    extend: {
      colors: {
        ink: '#1C1418',
        cream: '#FBF2E9',
        blossom: '#F6C9EF',
        rose: '#D81E4A',
        birdpink: '#F27FA8',
      },
      fontFamily: {
        display: ['"DynaPuff"', 'system-ui', 'sans-serif'],
        body: ['"Playpen Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        reveal: {
          '0%': { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'none' },
        },
      },
      animation: {
        reveal: 'reveal 0.7s cubic-bezier(0.2,0.7,0.2,1) both',
      },
    },
  },
  plugins: [require("preline/plugin")],
};
