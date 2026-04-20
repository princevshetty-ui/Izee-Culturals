/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Montage'", "'Nevarademo'", "serif"],
        body: ["'Montage'", "'Nevarademo'", "serif"],
      },
      colors: {
        gold: "#BEA35D",
        crimson: "#9E2636",
        "crimson-dim": "rgba(158,38,54,0.18)",
        surface: "#121317",
        base: "#0C0D10",
      },
    },
  },
  plugins: [],
}