/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Texto principal plateado (en vez de blanco puro), en línea con el
        // cromado del isotipo
        white: '#E9EDF4',
        // Fondo azul marino (un tono más claro que el negro grafito original,
        // manteniendo la misma progresión oscuro -> claro)
        graphite: {
          950: '#0A1220',
          900: '#101C33',
          800: '#17233D',
          700: '#223253',
        },
        // Gris metálico / plateado-cromado (tomado del isotipo LMH)
        metal: {
          900: '#1B212C',
          800: '#242B38',
          700: '#303847',
          600: '#414A5B',
          500: '#565F72',
          400: '#7A8496',
          300: '#A6B0C0',
          200: '#CDD3DE',
          100: '#E9EDF4',
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
