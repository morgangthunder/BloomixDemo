/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx,js,jsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#E50914',
        'brand-black': '#141414',
        'brand-dark': '#181818',
        'brand-light-gray': '#e5e5e5',
        'brand-gray': '#808080',
      }
    },
  },
  plugins: [],
}

