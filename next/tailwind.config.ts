import type { Config } from 'tailwindcss';

/**
 * Defensive config. The existing site hand-rolls its own utility layer in
 * ../style.css (`.flex`, `.px-6`, `.rounded-md`, `.container`, ...) and does NOT
 * load Tailwind. Both stylesheets are served from the same origin, so anywhere
 * the two define the same class name with different values, last-loaded wins and
 * the older pages silently shift.
 *
 * Three guards, all load-bearing:
 *   1. preflight: false  -> no global reset. Tailwind's reset would restyle every
 *      generator-built page that happens to load this bundle.
 *   2. container: false  -> ../style.css:177 defines `.container` with
 *      `padding-inline: 1rem`. Tailwind's own `.container` has different padding
 *      and max-widths. Disabling it leaves the site's definition authoritative.
 *   3. Colors resolve to the site's CSS custom properties rather than literals,
 *      so the three-state light/system/dark switch keeps working on these pages
 *      with no extra JS. Do not inline the hex values here.
 */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.{md,mdx}'],
  corePlugins: {
    preflight: false,
    container: false,
  },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-color)',
        panel: 'var(--panel-color)',
        'terminal-header': 'var(--terminal-header)',
        body: 'var(--text-color)',
        muted: 'var(--muted-color)',
        strong: 'var(--fg-strong)',
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover)',
        },
        purple: 'var(--accent-purple)',
        orange: 'var(--accent-orange)',
        green: 'var(--green-color)',
        docker: 'var(--docker-blue)',
        border: 'var(--border-color)',
      },
      // Alpha-capable variants, for `bg-primary-tint/10` style usage.
      backgroundColor: {
        'primary-tint': 'rgb(var(--primary-rgb) / <alpha-value>)',
        'purple-tint': 'rgb(var(--purple-rgb) / <alpha-value>)',
        'green-tint': 'rgb(var(--green-rgb) / <alpha-value>)',
        'orange-tint': 'rgb(var(--orange-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ["'Inter'", "'Inter-fallback'", 'sans-serif'],
        fira: ["'Fira Code'", "'Fira-Code-fallback'", 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
