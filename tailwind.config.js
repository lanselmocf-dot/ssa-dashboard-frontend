/** Tema centralizado: para aplicar a identidade visual do grupo, ajuste só a paleta `brand` abaixo. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6fb',
          100: '#d6e8f4',
          200: '#aed1e9',
          500: '#2b78ad',
          600: '#1f6190',
          700: '#184d74',
          800: '#133d5c',
          900: '#0e2d45'
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
