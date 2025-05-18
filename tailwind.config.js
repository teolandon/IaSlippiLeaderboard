/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'hero-pattern': "url('/images/diggles137.svg')",
      },
    },
  },
  safelist: [
    'bg-gray-600'
  ],
  plugins: [],
};
