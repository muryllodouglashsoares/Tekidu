/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern Slate/Indigo for the new template look
        ink: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#7583A8", // primary button color (soft indigo)
          800: "#5D6A8E", // primary button hover
          900: "#4B5678", // sidebar dark was here, but we will change sidebar to white
        },
        // Accent color
        honors: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171", // Soft red/coral accent
          500: "#EF4444",
          600: "#DC2626",
        },
        paper: "#F3F5F9", // main app background (light gray/blue)
        surface: "#FFFFFF",
        line: "#E2E8F0",
        ink900: "#1E293B", // main dark text
        success: "#10B981",
        danger: "#EF4444",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "16px", // Softer, rounder cards
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", // Soft ambient shadow
      },
    },
  },
  plugins: [],
};
