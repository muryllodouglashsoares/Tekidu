/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep academic navy — primary brand color (ledger / diploma cover)
        ink: {
          50: "#F1F3F9",
          100: "#DFE3EF",
          200: "#B9C2DC",
          300: "#8D9AC0",
          400: "#5A6A9B",
          500: "#38477A",
          600: "#26315D",
          700: "#1B2559", // primary
          800: "#141C45",
          900: "#0D1230",
        },
        // Warm amber — accent, evokes a wax seal / honors ribbon
        honors: {
          50: "#FDF6E9",
          100: "#FAEAC6",
          200: "#F3D48C",
          300: "#EDBE5C",
          400: "#E8A33D", // accent
          500: "#CC862A",
          600: "#A66A20",
        },
        paper: "#FAFAF8",
        surface: "#FFFFFF",
        line: "#E4E4E0",
        ink900: "#14181F",
        success: "#1F9D6B",
        danger: "#D64545",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,24,31,0.04), 0 1px 8px rgba(20,24,31,0.04)",
      },
    },
  },
  plugins: [],
};
