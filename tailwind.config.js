/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  corePlugins: {
    preflight: false, // Don't override existing global styles
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
