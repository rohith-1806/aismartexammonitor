/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-container': '#2563EB',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#FFFFFF',
        secondary: '#22C55E',
        'secondary-container': '#DCFCE7',
        'on-secondary': '#FFFFFF',
        'on-secondary-container': '#14532D',
        tertiary: '#F59E0B',
        'tertiary-container': '#FEF3C7',
        'on-tertiary': '#FFFFFF',
        'on-tertiary-container': '#92400E',
        success: '#22C55E',
        warning: '#F59E0B',
        'warning-container': '#FEF3C7',
        'on-warning-container': '#92400E',
        danger: '#EF4444',
        'danger-container': '#FEE2E2',
        'on-danger-container': '#991B1B',
        success: '#22C55E',
        'success-container': '#DCFCE7',
        'on-success-container': '#166534',
        error: '#EF4444',
        'error-container': '#FEE2E2',
        'on-error': '#FFFFFF',
        background: '#F8FAFC',
        surface: '#F8FAFC',
        'surface-bright': '#FFFFFF',
        'surface-variant': '#F3F4F6',
        'inverse-surface': '#111827',
        'on-inverse-surface': '#FFFFFF',
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#F8FAFC',
        'surface-container': '#F3F4F6',
        'surface-container-high': '#E5E7EB',
        'surface-container-highest': '#E5E7EB',
        'on-surface': '#111827',
        'on-surface-variant': '#4B5563',
        outline: '#E5E7EB',
        border: '#E5E7EB',
        'outline-variant': '#E5E7EB'
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px'
      },
      spacing: {
        'margin-mobile': '1rem',
        'container-max': '1280px',
        'margin-desktop': '2.5rem',
        'stack-sm': '0.5rem',
        'stack-md': '1rem',
        'stack-lg': '2rem',
        gutter: '1.5rem'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif']
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '56px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.05em' }]
      }
    }
  },
  plugins: []
}
