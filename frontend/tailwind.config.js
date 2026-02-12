/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0b',
          secondary: '#111113',
          tertiary: '#19191d',
          elevated: '#1e1e23',
          hover: '#252529',
        },
        border: {
          DEFAULT: '#2a2a30',
          subtle: '#1f1f25',
        },
        text: {
          primary: '#e8e6e3',
          secondary: '#9d9b97',
          tertiary: '#6b6966',
        },
        accent: {
          DEFAULT: '#ff4500',
          hover: '#ff5722',
          muted: 'rgba(255, 69, 0, 0.12)',
          glow: 'rgba(255, 69, 0, 0.06)',
        },
        gold: { DEFAULT: '#ffd700', muted: 'rgba(255, 215, 0, 0.1)' },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Source Serif 4"', 'serif'],
      },
    },
  },
  plugins: [],
}
