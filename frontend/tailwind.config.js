/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "border-emerald-600",
    "border-amber-600",
    "border-stone-800",
    "border-rose-700/60",
  ],
  theme: {
    extend: {
      colors: {
        cockpit: {
          bg: "#0c0a09",
          panel: "#1c1917",
          border: "#292524",
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Playfair Display"', 'Georgia', ' Cambria', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
