import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0c",
        panel: "#111113",
        border: "#1e1e22",
        text: "#e7e7ea",
        sub: "#a0a0a8",
        red: "#ef4444",
        redDim: "#7f1d1d"
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" }
    }
  },
  plugins: []
};
export default config;
