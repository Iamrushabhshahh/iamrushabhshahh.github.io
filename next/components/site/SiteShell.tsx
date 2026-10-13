import { chrome, type NavKey } from '@/lib/chrome';

/**
 * Header and footer, injected verbatim from the generator. The markup carries
 * its own skip link and the mobile-menu script, which runs as ordinary parsed
 * HTML in the static export.
 */
export function SiteShell({ active = 'none', children }: { active?: NavKey; children: React.ReactNode }) {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: chrome.headers[active] }} />
      {children}
      <div dangerouslySetInnerHTML={{ __html: chrome.footer }} />
    </>
  );
}
