/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
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
    },
  },
  plugins: [],
};
