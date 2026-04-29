/** @type {import('tailwindcss').Config} */
export default {
  content: ["./search.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111317",
        "surface-container-lowest": "#0c0e11",
        "surface-container-low": "#1a1c1f",
        "surface-container": "#1e2023",
        "surface-container-high": "#282a2d",
        "surface-container-highest": "#333538",
        "on-surface": "#e2e2e6",
        "on-surface-variant": "#c2c6d6",
        outline: "#8c909f",
        "outline-variant": "#424753",
        primary: "#aec6ff",
        "primary-container": "#4e8eff",
        error: "#ffb4ab"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
