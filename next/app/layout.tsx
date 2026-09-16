import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * The Next routes deliberately reuse ../style.css rather than shipping their own
 * stylesheet. Two reasons:
 *
 *   1. Visual parity. The generator-built pages and these pages sit one click
 *      apart. A second design system would show as a seam.
 *   2. The theme switch. The site's three-state light/system/dark switch works
 *      off `data-theme` on <html> plus CSS custom properties defined in
 *      style.css. Reusing the stylesheet means these pages inherit the theme for
 *      free, with no second implementation to keep in sync.
 *
 * The inline script below is copied verbatim from ../index.html and must stay
 * blocking, not deferred. It resolves the theme before first paint; deferring it
 * gives every visitor a flash of the wrong theme and moves the switch indicator
 * after load.
 */

const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('theme');if(p!=='light'&&p!=='dark')p='system';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var h=document.documentElement;h.dataset.theme=r;h.dataset.pref=p;h.style.colorScheme=r;}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Rushabh Shah', template: '%s · Rushabh Shah' },
  authors: [{ name: 'Rushabh Shah', url: SITE_URL }],
  creator: 'Rushabh Shah',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line react/no-danger -- must execute before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
