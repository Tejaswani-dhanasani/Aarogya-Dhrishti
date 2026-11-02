// Tailwind theme: teal/blue medical palette, Telugu-friendly fonts, and small entrance animations.
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.teal,
        secondary: colors.sky,
        accent: colors.cyan,
        success: colors.emerald,
        warning: colors.amber,
        error: colors.rose,
        neutral: colors.slate,
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Telugu"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        float: 'float 8s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
