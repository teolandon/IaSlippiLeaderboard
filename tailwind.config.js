/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'hero-pattern': "url('https://github.com/teolandon/IaSlippiLeaderboard/blob/2ded879a441c9572ec04df14f9e25e7075fcaf0f/diggles137.PNG')",
      },
    },
  },
  safelist: [
    'bg-gray-600'
  ],
  plugins: [],
};
