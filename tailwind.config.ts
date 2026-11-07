import type { Config } from "tailwindcss";
/* Tokens from the Stitch DESIGN.md ("Institutional Safeguards Desk"). */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--c-background) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--c-scl) / <alpha-value>)",
        "surface-container-low": "rgb(var(--c-sc-low) / <alpha-value>)",
        "surface-container": "rgb(var(--c-sc) / <alpha-value>)",
        "surface-container-high": "rgb(var(--c-sc-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--c-sc-highest) / <alpha-value>)",
        "on-surface": "rgb(var(--c-on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--c-on-surface-variant) / <alpha-value>)",
        outline: "rgb(var(--c-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--c-outline-variant) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--c-on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--c-primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--c-on-primary-container) / <alpha-value>)",
        secondary: "rgb(var(--c-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--c-secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--c-on-secondary-container) / <alpha-value>)",
        "secondary-fixed": "rgb(var(--c-secondary-fixed) / <alpha-value>)",
        tertiary: "rgb(var(--c-tertiary) / <alpha-value>)",
        "tertiary-fixed": "rgb(var(--c-tertiary-fixed) / <alpha-value>)",
        error: "rgb(var(--c-error) / <alpha-value>)",
        "error-container": "rgb(var(--c-error-container) / <alpha-value>)",
        "on-error-container": "rgb(var(--c-on-error-container) / <alpha-value>)",
        desk: "rgb(var(--c-desk) / <alpha-value>)"
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      fontSize: {
        "headline-xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        "headline-md": ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["1.375rem", { lineHeight: "1.875rem", fontWeight: "600" }],
        "title-md": ["1.125rem", { lineHeight: "1.625rem", fontWeight: "600" }],
        "title-sm": ["1rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.625rem" }],
        "body-md": ["0.9375rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.25rem" }],
        "label-md": ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "500" }],
        "label-micro": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.09em", fontWeight: "600" }]
      },
      borderRadius: { sm: "0.125rem", DEFAULT: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" },
      boxShadow: { paper: "0 2px 6px rgba(0,0,0,.10), 0 14px 34px rgba(0,0,0,.08)", card: "0 1px 8px rgba(0,0,0,0.04)" }
    }
  },
  plugins: []
};
export default config;
