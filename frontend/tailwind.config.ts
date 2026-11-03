import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-dark": "#020617",
        "brand-navy": "#0f172a",
        "brand-accent": "#22d3ee",
        "brand-glass": "rgba(255, 255, 255, 0.03)",
        ink: "#0B1220",
        navy: "#102A43",
        cyan: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        gold: "#F5B700",
      },
      backgroundImage: {
        "mesh-gradient": "radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.08), transparent 35%), radial-gradient(circle at 80% 100%, rgba(34, 211, 238, 0.05), transparent 35%)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;

