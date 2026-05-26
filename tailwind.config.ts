import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Map Tailwind color classes to CSS design tokens */
        bg: {
          base:     'var(--bg-base)',
          raised:   'var(--bg-raised)',
          card:     'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          subtle:  'var(--accent-subtle)',
          text:    'var(--accent-text)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover:   'var(--border-hover)',
        },
        ink: '#0f172a',
        muted: '#64748b',
        line: '#e2e8f0',
        loop: '#059669',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
