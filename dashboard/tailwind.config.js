/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'header': ['Rock Salt', 'cursive'],
        'body': ['Courier Prime', 'monospace'],
      },
      colors: {
        // True Black theme (default)
        'true-black': {
          bg: '#000000',
          surface: '#0a0a0a',
          border: '#1a1a1a',
          text: '#ffffff',
          'text-muted': '#a0a0a0',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
        },
        // Light theme
        light: {
          bg: '#ffffff',
          surface: '#f5f5f5',
          border: '#e5e5e5',
          text: '#000000',
          'text-muted': '#666666',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
        },
        // Glass theme (for AR/smart mirrors)
        glass: {
          bg: 'rgba(0, 0, 0, 0.3)',
          surface: 'rgba(255, 255, 255, 0.1)',
          border: 'rgba(255, 255, 255, 0.2)',
          text: '#ffffff',
          'text-muted': 'rgba(255, 255, 255, 0.7)',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

