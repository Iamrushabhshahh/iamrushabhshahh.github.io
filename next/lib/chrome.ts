import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Site chrome shared with ../scripts/build-blog.mjs.
 *
 * The generator writes next/.chrome.json on every run: the real header (per
 * active section), the footer, and the fingerprinted style.css / theme.js
 * URLs. Reading it here means these pages cannot drift from the rest of the
 * site, and they pick up a new theme.js hash on the same build that minted it,
 * instead of serving a stale cached script for four hours behind Cloudflare.
 *
 * Build order is therefore load-bearing: build-blog.mjs, then `next build`.
 */
export type NavKey = 'none' | 'speaking' | 'til' | 'now';

interface Chrome {
  cssHref: string;
  jsSrc: string;
  headers: Record<NavKey, string>;
  footer: string;
}

const CHROME_PATH = path.join(process.cwd(), '.chrome.json');

function load(): Chrome {
  if (!existsSync(CHROME_PATH)) {
    throw new Error(
      'next/.chrome.json is missing. Run `node scripts/build-blog.mjs` from the repo root first; ' +
        'it writes the shared header, footer and asset fingerprints this build depends on.',
    );
  }
  return JSON.parse(readFileSync(CHROME_PATH, 'utf8')) as Chrome;
}

export const chrome = load();
