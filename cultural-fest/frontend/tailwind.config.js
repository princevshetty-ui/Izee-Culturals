/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Cormorant Garamond'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        gold: "#C9A84C",
        surface: "#111111",
        base: "#0A0A0A",
      },
    },
  },
  plugins: [],
}