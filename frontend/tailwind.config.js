/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "border-emerald-600",
    "border-emerald-500/40",
    "border-amber-600",
    "border-amber-500/40",
    "border-stone-800",
    "border-rose-700/60",
  ],
  theme: {
    extend: {
      colors: {
        cockpit: {
          bg: "#0c0a09",
          panel: "#141210",
          surface: "#1c1917",
          raised: "#262320",
          border: "#292524",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Instrument Serif"', '"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
