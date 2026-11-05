/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ],
        display: [
          '"Plus Jakarta Sans"',
          'Inter',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          '"Space Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace'
        ]
      },
      colors: {
        base: 'rgb(var(--base) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        sub: 'rgb(var(--sub) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          soft: 'rgb(var(--primary-soft) / <alpha-value>)'
        }
      },
      boxShadow: {
        glass: '0 8px 32px rgba(23, 23, 23, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'glass-dark':
          '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-lg':
          '0 16px 48px rgba(23, 23, 23, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'glass-lg-dark':
          '0 16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
        'glow-primary': '0 0 24px rgba(0, 112, 243, 0.35), 0 0 64px rgba(0, 112, 243, 0.15)',
        'glow-emerald': '0 0 24px rgba(16, 185, 129, 0.30), 0 0 64px rgba(16, 185, 129, 0.12)',
        'glow-red': '0 0 24px rgba(239, 68, 68, 0.35), 0 0 64px rgba(239, 68, 68, 0.15)',
        'glow-amber': '0 0 24px rgba(245, 158, 11, 0.30)'
      },
      keyframes: {
        aurora: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -6%, 0) scale(1.08)' },
          '66%': { transform: 'translate3d(-5%, 4%, 0) scale(0.94)' }
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        pulsate: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.92' }
        }
      },
      animation: {
        aurora: 'aurora 18s ease-in-out infinite',
        'aurora-slow': 'aurora 26s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 7s ease-in-out infinite',
        marquee: 'marquee 35s linear infinite',
        shimmer: 'shimmer 2s infinite linear',
        pulsate: 'pulsate 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
