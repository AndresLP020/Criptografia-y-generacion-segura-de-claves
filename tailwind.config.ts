import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          void: "#050508",
          deep: "#0a0e17",
          panel: "#0d1117",
          card: "#12182a",
          /** Acento principal (cian) — coherente con UI */
          accent: "#00f0ff",
          /** Azul medio para bordes y highlights secundarios */
          accent2: "#3b82f6",
          /** Azul hielo para texto/ brillos suaves */
          ice: "#7dd3fc",
          /** Azul noche para fondos intermedios */
          navy: "#0c1929",
          navyDeep: "#071018",
          green: "#39ff14",
          warn: "#ffb020",
          danger: "#ff3366",
          muted: "#8b9bb4",
        },
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-cyber":
          "linear-gradient(rgba(56, 189, 248, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.035) 1px, transparent 1px)",
        "glow-radial":
          "radial-gradient(ellipse 85% 55% at 50% -15%, rgba(0, 240, 255, 0.12), transparent 52%), radial-gradient(ellipse 70% 45% at 80% 90%, rgba(30, 64, 175, 0.08), transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scan: "scan 8s linear infinite",
      },
      keyframes: {
        scan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
