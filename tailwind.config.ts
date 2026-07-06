import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: [], // Light theme only — dark mode intentionally disabled per brand direction.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ground — undyed cotton / handloom paper
        ivory: "#FBF9F4",
        cream: "#F5F1E8",
        beige: "#EFE9DC",
        // Ink — warm charcoal, never pure black for a softer luxury feel
        ink: "#2A2622",
        taupe: "#6E655A",
        muted: "#9A9084",
        // Zari — antique woven gold (the accent; deliberately not terracotta)
        zari: {
          DEFAULT: "#B08D4C",
          soft: "#C9AE78",
          deep: "#8A6D33",
          tint: "#F3ECDD",
        },
        line: "#E5DFD2",
        // Status
        success: "#4B7A52",
        danger: "#A24B3E",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.28em",
      },
      borderRadius: {
        card: "1.25rem",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(42,38,34,0.04), 0 8px 24px -12px rgba(42,38,34,0.12)",
        lift: "0 2px 4px rgba(42,38,34,0.05), 0 20px 48px -20px rgba(42,38,34,0.22)",
        glow: "0 0 0 1px rgba(176,141,76,0.25), 0 18px 50px -24px rgba(176,141,76,0.4)",
      },
      backgroundImage: {
        // Fine warp-and-weft thread texture — the loom motif
        weave:
          "repeating-linear-gradient(90deg, rgba(176,141,76,0.05) 0 1px, transparent 1px 6px), repeating-linear-gradient(0deg, rgba(176,141,76,0.04) 0 1px, transparent 1px 6px)",
        "gold-hairline":
          "linear-gradient(90deg, transparent, rgba(176,141,76,0.6) 20%, rgba(176,141,76,0.9) 50%, rgba(176,141,76,0.6) 80%, transparent)",
      },
      transitionTimingFunction: {
        silk: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        marquee: "marquee 32s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
