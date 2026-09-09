/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#f8f5ee',
          subtle: '#faf7f2',
        },
        card: {
          DEFAULT: '#fcf9f4',
          pure: '#ffffff',
        },
        sand: {
          50: '#faf7f2',
          100: '#f5ede1',
          200: '#e6dac8',
          300: '#dfd3c0',
          400: '#cbbea9',
          500: '#b0a18a',
        },
        terracotta: {
          DEFAULT: '#cc5a36',
          hover: '#b84c2a',
          active: '#9d3d1f',
          light: '#fbede8',
        },
        ochre: {
          DEFAULT: '#a67c42',
          dark: '#9c6a38',
          light: '#f5efe6',
        },
        oasis: {
          DEFAULT: '#2e7d32',
          hover: '#256629',
          light: '#eef7ee',
          border: '#c8e6c9',
        },
        charcoal: {
          DEFAULT: '#231f20',
          soft: '#1e293b',
          muted: '#6b7280',
          warm: '#7a6e65',
        },
        taupe: {
          DEFAULT: '#9e948c',
          light: '#f3ede2',
        },
        heart: {
          DEFAULT: '#e53935',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        desert: '0 2px 8px -2px rgba(166, 124, 66, 0.08), 0 1px 3px 0 rgba(35, 31, 32, 0.05)',
        card: '0 4px 12px -2px rgba(90, 60, 30, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        modal: '0 20px 35px -5px rgba(35, 31, 32, 0.25), 0 10px 15px -5px rgba(35, 31, 32, 0.15)',
      },
      borderWidth: {
        '1.5': '1.5px',
      }
    },
  },
  plugins: [],
}
