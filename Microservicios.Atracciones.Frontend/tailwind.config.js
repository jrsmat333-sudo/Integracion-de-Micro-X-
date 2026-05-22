/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cominca: {
          cream:   '#FAF8F5',
          charcoal:'#1F1E1C',
          forest:  '#2B3E2F',
          sand:    '#A89886',
          border:  '#E8E4DF',
          light:   '#F2EDE8',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeSlideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeSlideDown: 'fadeSlideDown 0.2s ease-out',
        fadeSlideUp:   'fadeSlideUp 0.3s ease-out',
        fadeIn:        'fadeIn 0.25s ease-out',
        toastIn:       'toastIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
