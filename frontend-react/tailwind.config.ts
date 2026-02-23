import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        sidebar: {
          DEFAULT: '#1e1b4b',
          hover:   '#312e81',
          active:  '#4338ca',
        },
        surface: {
          DEFAULT: '#f8fafc',
          alt:     '#f1f5f9',
        },
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
        },
      },
      spacing: {
        page: '1.5rem',
        sidebar: '15rem',
        topbar: '3.5rem',
      },
      width: {
        sidebar: '15rem',
      },
      height: {
        topbar: '3.5rem',
      },
      margin: {
        sidebar: '15rem',
      },
      padding: {
        page: '1.5rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
