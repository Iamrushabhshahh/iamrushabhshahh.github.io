#!/usr/bin/env node
/**
 * Hybrid-build guard rail.
 *
 * Two generators write into one output tree:
 *   - scripts/build-blog.mjs  owns /, /blog/**, /linux-foundation-coupon/**,
 *                             /finops-coupon/**, /coupons/, /go/**, /privacy/
 *   - next/                   owns /speaker/, /til/, /talks/, /contributions/,
 *                             /research/, /about/
 *
 * If those sets ever overlap, one generator silently overwrites the other's
 * output on deploy, and the page that disappears is whichever ran first. On the
 * coupon pages that is direct revenue loss, discovered days later via a ranking
 * drop rather than a build failure.
 *
 * This script fails the build instead. Run it after `next build` and before
 * anything is committed.
 *
 *   node scripts/verify-url-parity.mjs
 */
import { readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_OUT = path.join(ROOT, 'next', 'out');

/** Routes the Next app is allowed to own. Anything else it emits is a collision. */
const NEXT_OWNED = [
  '/speaker/',
  '/til/',
  '/talks/',
  '/contributions/',
  '/research/',
  '/about/',
  '/discounts/',
];

/** Never touchable by the Next build, whatever the config says. */
const PROTECTED = [
  '/',
  '/blog/',
  '/linux-foundation-coupon/',
  '/finops-coupon/',
  '/coupons/',
  '/go/',
  '/privacy/',
  '/links/',
  '/docker-captain/',
];

const walk = (dir, base = '') => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, `${base}/${entry}`);
    return entry === 'index.html' ? [`${base}/`] : [];
  });
};

const emitted = walk(NEXT_OUT).sort();

if (emitted.length === 0) {
  console.error('No pages found in next/out. Run `npm run build` in next/ first.');
  process.exit(1);
}

const collisions = [];
const unexpected = [];

for (const url of emitted) {
  // Direct hit on a protected route, or nested underneath one.
  const clash = PROTECTED.find((p) => (p === '/' ? url === '/' : url.startsWith(p)));
  if (clash) {
    collisions.push({ url, owner: 'build-blog.mjs', protectedBy: clash });
    continue;
  }
  if (url === '/404/') continue; // handled by the emitsOwn404 note below
  if (!NEXT_OWNED.some((p) => url.startsWith(p))) unexpected.push(url);
}

// Also confirm the generator's own output is still present and was not clobbered.
const missingProtected = PROTECTED.filter((p) => {
  const dir = p === '/' ? ROOT : path.join(ROOT, p);
  if (!existsSync(dir)) return true;
  // Section roots such as /go/ hold only per-slug children, no index.html of
  // their own. Presence of the directory is the correct check for those.
  return statSync(dir).isDirectory() && existsSync(path.join(dir, 'index.html'))
    ? false
    : !statSync(dir).isDirectory();
});

// Next always emits out/404.html. The repo already ships a hand-authored
// 404.html at the root, and a naive `cp -r next/out/. .` would silently
// replace it. Surface that as its own instruction, not a generic warning.
const emitsOwn404 = existsSync(path.join(NEXT_OUT, '404.html'));

let failed = false;

if (collisions.length) {
  failed = true;
  console.error('\nURL COLLISION: the Next build emitted pages owned by build-blog.mjs\n');
  for (const c of collisions) {
    console.error(`  ${c.url}\n    collides with the range owned by ${c.protectedBy}`);
  }
}

if (emitsOwn404) {
  console.warn(
    '\nNOTE: next/out/404.html exists and must NOT be copied to the site root.\n' +
      '  The repo\'s own 404.html is the one GitHub Pages serves.\n' +
      '  Copy with: rsync -a --exclude 404.html next/out/ ./\n',
  );
}

if (unexpected.length) {
  failed = true;
  console.error('\nUNEXPECTED ROUTE: emitted but not in the Next-owned allow list\n');
  for (const u of unexpected) console.error(`  ${u}`);
  console.error('\n  Add it to NEXT_OWNED here if it is intentional.');
}

if (missingProtected.length) {
  failed = true;
  console.error('\nMISSING: a generator-owned page is gone from the working tree\n');
  for (const m of missingProtected) console.error(`  ${m}`);
}

if (failed) {
  console.error('\nURL parity check FAILED. Nothing should be deployed in this state.\n');
  process.exit(1);
}

console.log(`URL parity OK. Next emitted ${emitted.length} page(s), all within its allow list:`);
for (const u of emitted) console.log(`  ${u}`);
