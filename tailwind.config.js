/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/inbox/**/*.{js,ts,jsx,tsx}",
    "./app/preferences/**/*.{js,ts,jsx,tsx}",
    "./app/signin/**/*.{js,ts,jsx,tsx}",
    // TODO(promote-to-phase-0): Workstream B places the signin route under the
    // `(auth)` route group and its component under `components/auth/`, but Phase 0's
    // globs above only cover `app/signin/**` and `components/signin/**`. Without
    // these two extra globs Tailwind drops every class on /signin. Promote these
    // entries into the Phase 0 list (or replace lines 6 and 9 with these) when
    // Phase 0 next opens a PR.
    "./app/(auth)/**/*.{js,ts,jsx,tsx}",
    "./components/auth/**/*.{js,ts,jsx,tsx}",
    "./components/inbox/**/*.{js,ts,jsx,tsx}",
    "./components/preferences/**/*.{js,ts,jsx,tsx}",
    "./components/signin/**/*.{js,ts,jsx,tsx}",
    "./components/ui/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-slate-500"],
  // Disable preflight so existing dashboard styles are not reset
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      colors: {
        accent: {
          DEFAULT: "#7dd3fc",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        ai: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          600: "#9333ea",
          700: "#7e22ce",
        },
      },
    },
  },
  plugins: [],
};
