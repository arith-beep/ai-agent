import type { Config } from "tailwindcss";

// Sales Agent Builder colors are stored as "R G B" CSS variables (see globals.css)
// so opacity modifiers like `bg-brand/40` work via Tailwind's rgb(var(--x) / <alpha-value>).
function withOpacity(cssVar: string) {
  return `rgb(var(${cssVar}) / <alpha-value>)`;
}

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

        // --- Sales Agent Builder design system (distinct namespace — the
        // internal platform's tokens above are static hex and untouched by
        // this; these resolve through CSS variables so they respond to the
        // light/dark toggle). See globals.css for the variable definitions.
        paper: withOpacity("--paper"),
        panel: { DEFAULT: withOpacity("--panel"), hover: withOpacity("--panel-hover") },
        sunken: withOpacity("--sunken"),
        hairline: { DEFAULT: withOpacity("--hairline"), soft: withOpacity("--hairline-soft") },
        fg: { DEFAULT: withOpacity("--fg"), muted: withOpacity("--fg-muted"), faint: withOpacity("--fg-faint") },
        brand: {
          DEFAULT: withOpacity("--brand"),
          hover: withOpacity("--brand-hover"),
          active: withOpacity("--brand-active"),
          soft: withOpacity("--brand-soft"),
          on: withOpacity("--brand-on"),
        },
        positive: { DEFAULT: withOpacity("--positive"), soft: withOpacity("--positive-soft") },
        caution: { DEFAULT: withOpacity("--caution"), soft: withOpacity("--caution-soft") },
        critical: { DEFAULT: withOpacity("--critical"), soft: withOpacity("--critical-soft") },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["Bricolage Grotesque", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
        pnl: "10px",
        "pnl-lg": "16px",
        "pnl-xl": "24px",
      },
      boxShadow: {
        "elevate-sm": "var(--shadow-sm)",
        "elevate-md": "var(--shadow-md)",
        "elevate-lg": "var(--shadow-lg)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.8,0.2,1) both",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
