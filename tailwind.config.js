/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'hero-pattern': "url('https://teolandon.github.io/IaSlippiLeaderboard/diggles137.PNG')",
      },
    },
  },
  safelist: [
    'bg-gray-600'
  ],
  plugins: [],
};
