/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scant alle JS/JSX/TS/TSX bestanden in de 'src' map
    "./public/index.html",       // En je hoofd HTML bestand
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

