import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E10600",
          black: "#0B0B0B",
          white: "#FFFFFF",
          muted: "#8A8A8A",
          panel: "#121212",
          border: "#1F1F1F",
        },
      },
      boxShadow: {
        glowRed: "0 0 0 1px rgba(225,6,0,.4), 0 0 25px rgba(225,6,0,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
