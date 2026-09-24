import type { Config } from 'tailwindcss';

/** Palette mirrors the CSS custom properties in src/index.css (:root). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: '#0B0D13',
        bg1: '#11141C',
        bg2: '#171B26',
        bg3: '#1F2433',
        line: '#232937',
        line2: '#303851',
        tx: '#EEF1F8',
        tx2: '#A6AFC6',
        tx3: '#6E7994',
        acc: '#8B7CF6',
        accHi: '#AC9FF9',
        grn: '#34D399',
        red: '#F87171',
        amber: '#FBBF24',
        teal: '#38BDF8',
        t1: '#F87171',
        t2: '#FB923C',
        t3: '#FBBF24',
        t4: '#818DA8',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'sans-serif'],
        disp: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
