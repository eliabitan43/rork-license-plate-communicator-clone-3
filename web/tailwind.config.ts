import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface1: "var(--color-surface-1)",
        surface2: "var(--color-surface-2)",
        surface3: "var(--color-surface-3)",
        brand: "var(--color-brand)",
        plate: "var(--color-plate)",
        plateText: "var(--color-plate-text)",
        plateBorder: "var(--color-plate-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        cyan: "var(--color-cyan)",
        text1: "var(--color-text-1)",
        text2: "var(--color-text-2)",
        text3: "var(--color-text-3)",
      },
      borderColor: {
        line1: "var(--border-1)",
        line2: "var(--border-2)",
      },
      borderRadius: {
        sm2: "10px",
        lg2: "16px",
        xl2: "22px",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
