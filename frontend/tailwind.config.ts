import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F3A",
          800: "#12284A",
          700: "#16345F",
        },
        accent: {
          DEFAULT: "#1D4ED8",
          light: "#3B82F6",
        },
        surface: "#F4F6F9",
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(11, 31, 58, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
