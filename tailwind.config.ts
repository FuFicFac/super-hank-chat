import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
          elevated: "hsl(var(--surface-elevated))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        classroom: {
          bg: "var(--c-bg)",
          raised: "var(--c-bg-raised)",
          soft: "var(--c-bg-soft)",
          ink: "var(--c-ink)",
          muted: "var(--c-ink-soft)",
          primary: "var(--c-primary)",
          secondary: "var(--c-secondary)",
          accent: "var(--c-accent)",
          hank: "var(--c-hank)",
          danger: "var(--c-danger)",
          border: "var(--c-border)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        ibm: ["var(--font-ibm)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [typography],
};

export default config;
