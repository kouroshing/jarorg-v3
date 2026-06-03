/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all app and component files for class names.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reusable "Jar" brand palette (light minimalist theme).
        jar: {
          // Premium vibrant gold-yellow accent — the single brand color.
          yellow: "#FACC15",
        },
      },
      fontFamily: {
        // Vazirmatn (loaded via next/font) with clean sans-serif fallbacks.
        sans: ["var(--font-vazirmatn)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Soft yellow glow used by the central "Create" action.
        glow: "0 8px 30px -6px rgba(250, 204, 21, 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-step": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-step": "fade-step 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
