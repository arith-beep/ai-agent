import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0c",
        surface: "#111114",
        "surface-raised": "#17171b",
        border: "#26262c",
        "border-subtle": "#1c1c20",
        ink: "#e8e8ec",
        "ink-muted": "#9a9aa3",
        "ink-faint": "#5f5f68",
        accent: "#6366f1",
        "accent-hover": "#7577f5",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
