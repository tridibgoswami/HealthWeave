/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          dark:   "#0A0F1E",
          navy:   "#0F172A",
          slate:  "#1E293B",
          blue:   "#0066FF",
          "blue-dark": "#0052CC",
          cyan:   "#06B6D4",
          orange: "#F97316",
          green:  "#10B981",
          red:    "#EF4444",
          amber:  "#F59E0B",
        },
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0A0F1E 0%, #0F172A 50%, #0D1B3E 100%)",
        "card-gradient": "linear-gradient(135deg, #0066FF 0%, #06B6D4 100%)",
        "orange-gradient": "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
        "green-gradient": "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #0F172A 0%, #0A0F1E 100%)",
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 10px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)",
        "blue-glow": "0 0 20px rgba(0,102,255,0.25)",
        "score-ring": "0 8px 32px rgba(0,0,0,0.12)",
        "sidebar": "4px 0 24px rgba(0,0,0,0.15)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
