import type { Config } from 'tailwindcss';

export const baseConfig: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: '#1E293B',
        'primary-light': '#334155',
        surface: '#FFFFFF',
        'surface-alt': '#F8FAFC',
        border: '#E2E8F0',
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        accent: 'var(--color-accent)',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        toast: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
