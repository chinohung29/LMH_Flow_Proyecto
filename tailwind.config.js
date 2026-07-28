/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondo negro grafito (calibrado sobre el navy de fondo del logo)
        graphite: {
          950: '#070A0F',
          900: '#0C0F14',
          800: '#12161C',
          700: '#1A1F27',
        },
        // Gris metálico / plateado-cromado (tomado del isotipo LMH)
        metal: {
          900: '#171B21',
          800: '#20242B',
          700: '#2A2F38',
          600: '#3A4048',
          500: '#4E555F',
          400: '#6B7280',
          300: '#9AA4B0',
          200: '#C6C7C9',
          100: '#E4E5E7',
        },
        // Azul acero del logo. El 600 se satura/aclara sobre la misma tonalidad
        // para que botones y links mantengan buen contraste sobre el fondo.
        electric: {
          950: '#0A1826',
          900: '#0F2338',
          800: '#142F4E',
          700: '#1D4568',
          600: '#2B86EE',
          500: '#4E9CF2',
          400: '#7DB6F5',
          300: '#A9CEF8',
          200: '#D3E6FB',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'ui-serif', 'serif'],
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(43, 134, 238, 0.55)',
      },
    },
  },
  plugins: [],
}
