/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        content: '72rem',        // ~1152px - layout standard
        'content-wide': '90rem', // ~1440px - layout ampio ma centrato
      },
      colors: {
        // Dark theme base colors
        dark: {
          50: '#1a1a2e',
          100: '#16162a',
          200: '#121226',
          300: '#0f0f22',
          400: '#0c0c1e',
          500: '#0a0a1a',
          600: '#080816',
          700: '#060612',
          800: '#04040e',
          900: '#02020a',
        },
        // Primary purple/violet
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Accent colors - Emerald/Cyan for positive values
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Surface colors for cards and UI elements
        surface: {
          50: 'rgba(255, 255, 255, 0.05)',
          100: 'rgba(255, 255, 255, 0.08)',
          200: 'rgba(255, 255, 255, 0.10)',
          300: 'rgba(255, 255, 255, 0.12)',
          400: 'rgba(255, 255, 255, 0.15)',
          500: 'rgba(255, 255, 255, 0.20)',
          600: 'rgba(255, 255, 255, 0.25)',
          700: 'rgba(255, 255, 255, 0.30)',
          800: 'rgba(255, 255, 255, 0.40)',
          900: 'rgba(255, 255, 255, 0.50)',
        },
        // Muted text colors
        muted: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16162a 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(124, 58, 237, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(167, 139, 250, 0.1) 0px, transparent 50%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.4), 0 2px 10px -2px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 30px rgba(124, 58, 237, 0.4)',
        'glow-sm': '0 0 15px rgba(124, 58, 237, 0.3)',
        'glow-accent': '0 0 30px rgba(16, 185, 129, 0.4)',
        'glow-accent-sm': '0 0 15px rgba(16, 185, 129, 0.3)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(124, 58, 237, 0.5)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(124, 58, 237, 0.3)' },
          '50%': { borderColor: 'rgba(124, 58, 237, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
