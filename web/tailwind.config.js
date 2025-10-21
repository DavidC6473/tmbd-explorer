/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f8fafc",
        slate: { 25: "#f9fafb"},
      },
      boxShadow: { soft: "0 8px 30px rgba(0,0,0,0.08" },
      borderRadius: { x12: "1rem" },
    },
  },
  plugins: [],
};

