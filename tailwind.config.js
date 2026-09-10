/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all app and component files for class names.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@premieroctet/next-admin/dist/**/*.{js,ts,jsx,tsx,mjs}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  presets: [require("@premieroctet/next-admin/preset")],
  theme: {
    extend: {
      colors: {
        // Reusable "Jar" brand palette (Anthropic / Claude editorial theme).
        jar: {
          logo: '#CC785C',        // نارنجی سفالی نشان
          canvas: '#FAF9F5',      // پس‌زمینه کاغذ گرم
          surface: '#FFFFFF',     // پنل‌ها و کارت‌ها
          primary: '#141413',     // مشکی خالص دکمه‌های اصلی و متون
          primaryHover: '#282725',
          border: '#E5E0D8',      // خطوط و بردرها
          muted: '#66605B',       // متن‌های ثانویه و توضیحات
          soft: '#F3F1EC',        // بک‌گراند هاور و غیرفعال
          yellow: '#FACC15',
        },
      },
      fontFamily: {
        sans: ["Vazirmatn", "var(--font-vazirmatn)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        // Soft yellow glow used by the central "Create" action.
        glow: "0 8px 30px -6px rgba(250, 204, 21, 0.45)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "2xs": "0 1px 1px 0 rgba(0, 0, 0, 0.03)",
      },
      spacing: {
        7.5: "1.875rem",
        8.5: "2.125rem",
        13: "3.25rem",
        15: "3.75rem",
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "orbit-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "orbit-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-step": "fade-step 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.35s ease-out forwards",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "radar-sweep": "radar-sweep 3.8s linear infinite",
        "orbit-slow": "orbit-slow 14s linear infinite",
        "orbit-reverse": "orbit-reverse 19s linear infinite",
      },
    },
  },
  plugins: [],
};
