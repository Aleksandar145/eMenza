import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f0f0f",
        primary: "#22D3EE",
        "primary-container": "#22D3EE",
        "primary-fixed-dim": "#06B6D4",
        "on-primary": "#000000",
        "on-primary-container": "#042F2E",
        "on-surface": "#E6E6E6",
        surface: "#121212",
        "surface-dim": "#0f0f0f",
        "surface-container-lowest": "#0b0b0b",
        "surface-container-low": "#121212",
        "surface-container": "#121212",
        "surface-container-high": "#171717",
        "surface-container-highest": "#1b1b1b",
        "surface-variant": "#171717",
        panel: "#121212",
        "panel-muted": "#161616",
        accent: "#22D3EE",
        "accent-border": "#1F1F1F",
        "accent-surface": "#121212",
        foreground: "#FFFFFF",
        "muted-foreground": "#9CA3AF",
        "outline-variant": "#1F1F1F",
        "on-surface-variant": "#9CA3AF",
        error: "#FFB4AB",
        "error-container": "#93000A",
        tertiary: "#B7FFD2",
        "tertiary-fixed-dim": "#55DE9A",
        "chart-purple": "#A585FF",
        "brand-black": "#000000",
        border: "#1F1F1F",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "1rem",
        xl: "0.75rem",
        full: "9999px",
        card: "1.5rem",
      },
      spacing: {
        "sidebar-width": "240px",
        "header-height": "88px",
        gutter: "24px",
      },
      boxShadow: {
        panel: "0 18px 60px rgb(0 0 0 / 0.28)",
      },
    },
  },
};

export default config;
