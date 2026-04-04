/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable JS-based dark mode toggling
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bitcoin: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#f9a84d',
          500: '#F7931A', // Core Bitcoin Orange
          600: '#d97f14',
          700: '#c2410c',
        },
        surface: {
          light: '#FFFFFF',
          light_alt: '#F8FAFC',
          dark: '#0e1014', // Slightly lighter than #030304 for cards
          dark_alt: '#030304', // True dark background
          950: '#020617', // Preserving compatibility
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        muted: {
          light: '#64748b',
          dark: '#94a3b8',
        },
        borderc: {
          light: '#E2E8F0',
          dark: 'rgba(255, 255, 255, 0.1)',
        },
        brand: {
          // Maintaining the old classes to not break anything mid-refactor, mapping them to orange
          500: '#F7931A',
          400: '#f9a84d',
        }
      },
      boxShadow: {
        'fintech-light': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'fintech-lg-light': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'glow-orange': '0 0 15px rgba(247, 147, 26, 0.25)',
        'glow-orange-strong': '0 0 25px rgba(247, 147, 26, 0.4)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}


