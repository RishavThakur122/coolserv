/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#e0f7ff',100:'#b3ecff',200:'#80dfff',300:'#4dd2ff',400:'#26c7ff',500:'#00bcff',600:'#0099d9',700:'#0077b3',800:'#005680',900:'#00364d' },
      },
      fontFamily: {
        sans: ['DM Sans','system-ui','sans-serif'],
        display: ['Sora','system-ui','sans-serif'],
      },
    },
  },
  plugins: [],
}
