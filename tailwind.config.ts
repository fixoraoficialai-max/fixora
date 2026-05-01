import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fixora Design Tokens
        background: "#070709",
        surface: {
          DEFAULT: "#0E0E11",
          elevated: "#16161A",
          overlay: "#1C1C22",
        },
        border: {
          DEFAULT: "#1E1E26",
          subtle: "#16161C",
          strong: "#2A2A35",
        },
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#818CF8",
          muted: "rgba(99,102,241,0.15)",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA",
          muted: "rgba(139,92,246,0.15)",
        },
        success: {
          DEFAULT: "#10B981",
          muted: "rgba(16,185,129,0.15)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          muted: "rgba(245,158,11,0.15)",
        },
        danger: {
          DEFAULT: "#EF4444",
          muted: "rgba(239,68,68,0.15)",
        },
        text: {
          primary: "#F4F4F5",
          secondary: "#A1A1AA",
          muted: "#71717A",
          disabled: "#3F3F46",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #6366F1, #8B5CF6)",
        "gradient-surface": "linear-gradient(180deg, #0E0E11 0%, #070709 100%)",
        "gradient-glow": "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)",
        "gradient-hero": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.3), transparent)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(99,102,241,0.15)",
        "glow-sm": "0 0 20px rgba(99,102,241,0.1)",
        "inner-border": "inset 0 0 0 1px rgba(255,255,255,0.05)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
