/** @type {import('tailwindcss').Config} */
export default {
  content: ["./search.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f7f9fc",
        "surface-container": "#f0f2f5",
        "surface-container-high": "#e8ecf1",
        "surface-container-highest": "#e0e5ec",
        "on-surface": "#1a1c20",
        "on-surface-variant": "#5c6270",
        outline: "#8c929f",
        "outline-variant": "#d1d5db",
        primary: "#005ac1",
        "primary-container": "#d6e3ff",
        error: "#ba1a1a"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
