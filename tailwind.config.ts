import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      // Mobile-first breakpoints
      'xs': '320px',     // Small phones
      'sm': '480px',     // Large phones
      'md': '768px',     // Tablets
      'lg': '1024px',    // Small laptops
      'xl': '1280px',    // Desktop
      '2xl': '1536px',   // Large screens
      '3xl': '1920px',   // Extra large screens
      
      // Device-specific breakpoints
      'iphone-se': '375px',
      'iphone-plus': '414px',
      'ipad': '768px',
      'ipad-pro': '1024px',
      
      // Orientation breakpoints
      'landscape': {'raw': '(orientation: landscape)'},
      'portrait': {'raw': '(orientation: portrait)'},
      
      // Touch device detection
      'touch': {'raw': '(hover: none) and (pointer: coarse)'},
      'no-touch': {'raw': '(hover: hover) and (pointer: fine)'},
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00A651',
          50: '#E6F9F0',
          100: '#B3EDCF',
          200: '#80E1AE',
          300: '#4DD58D',
          400: '#1AC96C',
          500: '#00A651',
          600: '#008A43',
          700: '#006E35',
          800: '#005227',
          900: '#003619',
          // Aliases for backward compatibility
          light: '#00C85F',
          dark: '#008A43',
        },
        secondary: '#F5F5F5',
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        
        // Mobile-specific colors
        'mobile-nav': '#FFFFFF',
        'mobile-nav-active': '#F0FDF4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Responsive typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        
        // Fluid typography
        'fluid-xs': 'clamp(0.75rem, 2vw, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 2.5vw, 1rem)',
        'fluid-base': 'clamp(1rem, 3vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 3.5vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 4vw, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 5vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 6vw, 3rem)',
      },
      spacing: {
        // Touch-friendly spacing
        'touch': '44px',     // Minimum touch target
        'touch-sm': '36px',  // Smaller touch target
        'touch-lg': '52px',  // Larger touch target
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px',
        'touch-sm': '36px',
        'touch-lg': '52px',
      },
      minWidth: {
        'touch': '44px',
        'touch-sm': '36px',
        'touch-lg': '52px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 1s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      zIndex: {
        'mobile-nav': '50',
        'mobile-overlay': '40',
        'dropdown': '30',
        'sticky': '20',
        'above': '10',
      },
      borderRadius: {
        'mobile': '0.75rem',
      },
      boxShadow: {
        'mobile-nav': '0 -2px 10px rgba(0, 0, 0, 0.1)',
        'mobile-card': '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    // Custom utilities for mobile development
    function({ addUtilities }: any) {
      addUtilities({
        '.safe-padding': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.no-scrollbar': {
          '-webkit-overflow-scrolling': 'touch',
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.smooth-scroll': {
          'scroll-behavior': 'smooth',
          '-webkit-overflow-scrolling': 'touch',
        },
      })
    },
  ],
}

export default config