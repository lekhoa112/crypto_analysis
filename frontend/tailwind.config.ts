import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        crypto: {
          bg: "#0A0F1C",
          card: "#131B2E",
          primary: "#00E5A8",
          secondary: "#5B7FFF",
          danger: "#FF4D6D",
          text: "#FFFFFF",
          muted: "#94A3B8",
        },
      },
      borderRadius: {
        panel: "8px",
      },
    },
  },
  plugins: [],
} satisfies Config;
