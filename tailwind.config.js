/** @type {import('tailwindcss').Config} */
export default {
  // Light/dark mode via `class` on <html> — toggled from TopNav, persisted
  // to localStorage. Dark is the default identity (gallery feel); light
  // is the alternative reading mode.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        wordmark: ['"Workbench"', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        ui: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
