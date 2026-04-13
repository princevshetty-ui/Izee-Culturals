/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Montage'", "'Nevarademo'", "serif"],
        body: ["'Montage'", "'Nevarademo'", "serif"],
      },
      colors: {
        gold: "#C9A84C",
        crimson: "#B22234",
        "crimson-dim": "rgba(178,34,52,0.2)",
        surface: "#111111",
        base: "#0A0A0A",
      },
    },
  },
  plugins: [],
}