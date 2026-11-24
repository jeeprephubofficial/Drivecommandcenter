/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { canvas: "#0B1020", panel: "#111A35", line: "#263252" }, borderRadius: { "3xl": "1.5rem" } } },
  plugins: []
};