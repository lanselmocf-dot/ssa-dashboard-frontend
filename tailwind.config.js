/** Tema centralizado: paleta alinhada à identidade visual da SSA Distribuidora */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#dce6ff',
          200: '#bfd2fe',
          300: '#94b3fd',
          400: '#618cf9',
          500: '#1d4ed8',
          600: '#00259e',
          700: '#001a7e',
          800: '#001264',
          900: '#000b49',
          950: '#000732'
        },
        'brand-green': {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857'
        },
        'brand-cyan': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
