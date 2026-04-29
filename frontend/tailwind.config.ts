import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oab: {
          blue: "#003087",
          gold: "#C9A24A",
          light: "#EEF2FF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
