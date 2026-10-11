import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        primary: "hsl(var(--primary))",
      },
      boxShadow: { glow: "0 0 44px rgba(161, 0, 247, .2)" },
      animation: { "fade-up": "fade-up .5s ease both", "pulse-soft": "pulse-soft 2.2s ease-in-out infinite" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: ".65" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;

