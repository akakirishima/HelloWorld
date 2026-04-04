/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 14px 32px rgba(15, 23, 42, 0.08)",
        soft: "0 10px 24px rgba(15, 23, 42, 0.05)",
      },
    },
  },
  plugins: [],
}
