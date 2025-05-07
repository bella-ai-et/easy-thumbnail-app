/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'sparkle': 'sparkle 2s infinite',
        'sparkle-slow': 'sparkle 3s infinite',
        'sparkle-delay': 'sparkle 2s infinite 0.5s',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        sparkle: {
          '0%, 100%': { opacity: 0, transform: 'scale(0.5)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}