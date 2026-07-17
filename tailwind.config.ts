import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base — "night pitch": preto com fundo esverdeado, não preto puro
        base: {
          DEFAULT: "#0A0F0D",
          deep: "#060908",
        },
        surface: {
          DEFAULT: "#131A17",
          elevated: "#1B2420",
          hover: "#212B26",
        },
        border: {
          subtle: "#233029",
          strong: "#37453D",
        },
        text: {
          primary: "#F3F6F4",
          secondary: "#9FADA5",
          tertiary: "#69766F",
        },
        // Ouro — accent primário / premium / CTA principal
        gold: {
          DEFAULT: "#E3B34F",
          dim: "#B8934A",
          bright: "#F5CE7A",
        },
        // Teal — accent tático / live / timer / dados em destaque
        teal: {
          DEFAULT: "#2FE0BE",
          dim: "#1F8F7C",
          bright: "#6FF0D8",
        },
        danger: {
          DEFAULT: "#FF5C5C",
          dim: "#B84343",
        },
        // Verde/Amarelo — feedback semântico de compatibilidade do Draft (item 7)
        success: {
          DEFAULT: "#4ADE80",
          dim: "#2F9E5B",
        },
        warning: {
          DEFAULT: "#F5C542",
          dim: "#B8912F",
        },
        orange: {
          DEFAULT: "#F5A623",
          dim: "#B87A1A",
        },
        // Roxo — cartas "Auge" (temporadas históricas marcantes)
        prime: {
          DEFAULT: "#A855F7",
          dim: "#6B21A8",
          bright: "#D8B4FE",
        },
        // Fundo claro das cartas "Lendária" (ídolos históricos) — único ponto da interface com base clara
        legend: {
          bg: "#F3F0E8",
          text: "#1A1712",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,0.5)",
        "glow-gold": "0 0 0 1px rgba(227,179,79,0.4), 0 0 24px -4px rgba(227,179,79,0.35)",
        "glow-teal": "0 0 0 1px rgba(47,224,190,0.4), 0 0 24px -4px rgba(47,224,190,0.35)",
        "glow-success": "0 0 0 1px rgba(74,222,128,0.45), 0 0 20px -4px rgba(74,222,128,0.4)",
        "glow-warning": "0 0 0 1px rgba(245,197,66,0.45), 0 0 20px -4px rgba(245,197,66,0.4)",
        "glow-prime": "0 0 0 1px rgba(168,85,247,0.4), 0 0 20px -4px rgba(168,85,247,0.4)",
        "glow-danger": "0 0 0 1px rgba(255,92,92,0.4), 0 0 20px -4px rgba(255,92,92,0.45)",
      },
      backgroundImage: {
        "pitch-dots":
          "radial-gradient(circle, rgba(159,173,165,0.14) 1px, transparent 1px)",
      },
      backgroundSize: {
        "pitch-grid": "28px 28px",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(255,92,92,0.5)" },
          "70%": { boxShadow: "0 0 0 12px rgba(255,92,92,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,92,92,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
