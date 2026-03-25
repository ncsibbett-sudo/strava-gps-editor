/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strava: {
          orange: '#FC4C02',
        },
      },
      padding: {
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      height: {
        screen: ['100vh', '100dvh'],
      },
    },
  },
  plugins: [],
}
