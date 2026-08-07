import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './content/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        yc: {
          bg: '#F5F5EE',
          'bg-alt': '#FAFAF7',
          'bg-card': '#F8F7F2',
          text: '#1C1C1C',
          'text-secondary': '#333333',
          'text-muted': '#666666',
          accent: '#FF6600',
          'accent-hover': '#E55C00',
          border: '#E5E2D9'
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        border: 'var(--border)'
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace']
      },
      maxWidth: {
        '8xl': '1400px'
      }
    }
  },
  plugins: []
};

export default config;
