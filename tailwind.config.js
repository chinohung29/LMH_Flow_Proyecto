/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondo negro grafito
        graphite: {
          950: '#0A0C0F',
          900: '#0F1216',
          800: '#15181D',
          700: '#1C2027',
        },
        // Gris metálico para superficies (cards, borders, inputs)
        metal: {
          800: '#20242B',
          700: '#2A2F38',
          600: '#3A4048',
          500: '#4E555F',
          400: '#6B7280',
          300: '#9CA3AF',
        },
        // Azul eléctrico - color principal de marca
        electric: {
          950: '#031A4D',
          900: '#052E8F',
          800: '#0740C4',
          700: '#0B52E8',
          600: '#1465FF',
          500: '#2B7BFF',
          400: '#5C9AFF',
          300: '#8FBBFF',
          200: '#C2DAFF',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(43, 123, 255, 0.55)',
      },
    },
  },
  plugins: [],
}
