import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07131f",
          900: "#0c1c2c",
          800: "#132536",
        },
        foam: {
          50: "#f4f8fb",
          100: "#e7eef4",
        },
        brand: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0f766e",
          700: "#115e59",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        board: "0 18px 50px -28px rgba(7, 19, 31, 0.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
