#!/usr/bin/env node
/* End-to-end UI/UX sweep across every page in the sitemap, at mobile/tablet/
   desktop widths and both themes. Run this instead of asking an agent to
   click through pages by hand — it's the same checks, free of per-run token
   cost, and the page list is read fresh from sitemap.xml every time so it
   can never go stale the way a hardcoded list does.

   Usage:
     npm run e2e                         # full sweep against localhost:8080
     E2E_BASE=https://rushabhshah.dev npm run e2e
     node scripts/e2e-check.mjs /linux-foundation-coupon   # only paths starting with this

   Requires the site to already be served (`npm run serve` in another
   terminal) unless E2E_BASE points at a live deployment. Needs the
   playwright-core devDependency and a cached Chromium (already present on
   this machine; elsewhere run `npx playwright install chromium` once). */

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.E2E_BASE || 'http://localhost:8080';
const PATH_FILTER = process.argv[2] || '';
const OUT = path.join(ROOT, '.e2e-report');
const SHOT_DIR = path.join(OUT, 'screenshots');

const VIEWPORTS = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1440, height: 900 },
];
const THEMES = ['light', 'dark'];

/* Noise that shows up in every page's console and means nothing about this
   site's own code: Cloudflare's bot-challenge script, GoatCounter's beacon
   failing in a sandboxed test context, and favicon 404s from running off a
   plain http.server that doesn't know about /favicon.ico redirects. */
const IGNORED_CONSOLE = /challenge-platform|goatcounter|favicon\.ico/i;

function readSitemapPaths() {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const paths = locs.map(u => new URL(u).pathname);
  // A few real pages the sitemap deliberately excludes (noindex, or just not
  // commercial), plus the 404 page itself — all worth the same UI checks.
  paths.push('/reading/', '/games/', '/this-page-does-not-exist/');
  return [...new Set(paths)].filter(p => p.startsWith(PATH_FILTER));
}

async function checkPage(page, url) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => {
    if (m.type() === 'error' && !IGNORED_CONSOLE.test(m.text())) {
      consoleErrors.push(m.text().slice(0, 160));
    }
  });
  page.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 160)));

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(e => ({ _navError: String(e.message || e) }));
  const status = response && !response._navError ? response.status() : null;
  const navError = response && response._navError;

  // Scroll the whole page gradually so lazy-loaded images and
  // scroll-triggered animations actually fire before we inspect the DOM.
  // theme.js reveals cards via IntersectionObserver with a -12% rootMargin,
  // i.e. an element must sit well inside the viewport before it's marked
  // visible — a fast scroll-and-snap-back can leave a card's callback still
  // pending when we check, reporting a real animation as a phantom bug.
  // 150ms/step plus a generous settle time avoids that false positive.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(1000);

  const dom = await page.evaluate(() => {
    const overflowPx = document.documentElement.scrollWidth - window.innerWidth;

    const brokenImages = [...document.images]
      .filter(img => img.loading !== 'lazy' && img.complete && img.naturalWidth === 0 && !img.src.startsWith('data:'))
      .map(img => img.src.split('/').slice(-2).join('/'));

    // Content that's invisible (opacity 0) but large enough and not
    // deliberately hidden — usually a theme/animation bug, not a <template>.
    const invisibleContent = [...document.querySelectorAll('main *, article *')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 100 && r.height > 30 && parseFloat(cs.opacity) === 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      })
      .slice(0, 5)
      .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0] || ''}`);

    // Elements that spill past the right edge of the viewport — the classic
    // mobile "unwanted horizontal scroll" bug. A table/pre/code block that's
    // actually wrapped in its own scrollable container is fine (that's the
    // deliberate pattern for wide pricing tables); only exclude it when an
    // ancestor really has overflow-x set, not just a name that sounds right —
    // a class-name heuristic here previously hid the real culprit (a pricing
    // table that overflows the whole page, not just its own container).
    const hasScrollableAncestor = el => {
      for (let n = el; n; n = n.parentElement) {
        const ov = getComputedStyle(n).overflowX;
        if (ov === 'auto' || ov === 'scroll') return true;
      }
      return false;
    };
    const overflowingElements = overflowPx > 1
      ? [...document.querySelectorAll('body *')]
          .filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > window.innerWidth + 2 && !hasScrollableAncestor(el);
          })
          .slice(0, 5)
          .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0] || ''}`)
      : [];

    // Tap targets under ~24px in any dimension are hard to hit on a phone.
    // Only flagged at narrow viewports (checked by the caller), and only for
    // things a visitor would actually try to tap.
    const tinyTapTargets = [...document.querySelectorAll('a, button, input[type="checkbox"], input[type="radio"], summary')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false; // not rendered/visible
        return (r.width > 0 && r.width < 24) || (r.height > 0 && r.height < 24);
      })
      .slice(0, 5)
      .map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ')[0] || ''}`);

    return { overflowPx, brokenImages, invisibleContent, overflowingElements, tinyTapTargets };
  }).catch(e => ({ _evalError: String(e.message || e) }));

  return { status, navError, consoleErrors, pageErrors, dom };
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const probe = await fetch(BASE).catch(() => null);
  if (!probe || !probe.ok) {
    console.error(`Can't reach ${BASE}. Start the site first: npm run serve`);
    process.exit(1);
  }

  const pagePaths = readSitemapPaths();
  console.log(`Sweeping ${pagePaths.length} page(s) x ${VIEWPORTS.length} viewport(s) x ${THEMES.length} theme(s) against ${BASE}`);
  if (PATH_FILTER) console.log(`(filtered to paths starting with "${PATH_FILTER}")`);

  const browser = await chromium.launch();
  const findings = [];
  let combosRun = 0;

  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        await ctx.addInitScript(t => {
          try { localStorage.setItem('theme', t); } catch (e) {}
          // addInitScript also fires on the blank initial document Playwright
          // creates before goto() navigates anywhere — documentElement exists
          // there, but setting on it is pointless and occasionally null mid-
          // transition, so guard it instead of reporting a phantom pageerror.
          if (document.documentElement) document.documentElement.dataset.theme = t;
        }, theme);

        for (const p of pagePaths) {
          const page = await ctx.newPage();
          const result = await checkPage(page, BASE + p);
          combosRun++;

          const isNarrow = viewport.width <= 768;
          const issues = [];
          if (result.navError) issues.push(`navigation failed: ${result.navError}`);
          if (result.status && result.status >= 400 && p !== '/this-page-does-not-exist/') issues.push(`HTTP ${result.status}`);
          if (!result.status && !result.navError && p !== '/this-page-does-not-exist/') issues.push('no response status (check manually)');
          if (result.dom?._evalError) issues.push(`eval error: ${result.dom._evalError}`);
          if (result.dom?.overflowPx > 1) issues.push(`horizontal overflow ${result.dom.overflowPx}px`);
          if (result.dom?.brokenImages?.length) issues.push(`broken image(s): ${result.dom.brokenImages.join(', ')}`);
          if (result.dom?.invisibleContent?.length) issues.push(`invisible content: ${result.dom.invisibleContent.join(', ')}`);
          if (result.dom?.overflowingElements?.length) issues.push(`overflowing element(s): ${result.dom.overflowingElements.join(', ')}`);
          if (isNarrow && result.dom?.tinyTapTargets?.length) issues.push(`tiny tap target(s) (<24px): ${result.dom.tinyTapTargets.join(', ')}`);
          // The deliberate 404 test page will always log "Failed to load
          // resource: 404" for its own document request — that's the page
          // doing its job, not a bug. Any other console error there (or
          // anywhere else) still gets reported.
          const realConsoleErrors = p === '/this-page-does-not-exist/'
            ? result.consoleErrors.filter(e => !/404 \(File not found\)/.test(e))
            : result.consoleErrors;
          if (realConsoleErrors.length) issues.push(`console error(s): ${realConsoleErrors.slice(0, 3).join(' | ')}`);
          if (result.pageErrors.length) issues.push(`page error(s): ${result.pageErrors.slice(0, 3).join(' | ')}`);

          if (issues.length) {
            findings.push({ path: p, viewport: viewport.label, width: viewport.width, theme, issues });
          }

          // One screenshot per page is enough to eyeball layout; take it at
          // mobile-light and desktop-dark, matching the two combos people
          // actually look at when reviewing a change.
          if ((viewport.label === 'mobile' && theme === 'light') || (viewport.label === 'desktop' && theme === 'dark')) {
            const file = `${viewport.label}-${theme}${p.replace(/\//g, '_') || '_home'}.png`.replace(/_+/g, '_');
            await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: true }).catch(() => {});
          }

          await page.close();
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    base: BASE,
    ranAt: new Date().toISOString(),
    pagesChecked: pagePaths.length,
    combosRun,
    issueCount: findings.length,
    findings,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  const md = [
    `# E2E UI/UX sweep — ${report.ranAt}`,
    ``,
    `Base: ${BASE} · ${pagePaths.length} pages × ${VIEWPORTS.length} viewports × ${THEMES.length} themes = ${combosRun} checks`,
    ``,
    findings.length ? `## ${findings.length} finding(s)` : '## No issues found',
    ``,
    ...findings.map(f => `- **${f.path}** — ${f.viewport} (${f.width}px) / ${f.theme}: ${f.issues.join('; ')}`),
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'report.md'), md);

  console.log(`\n${findings.length} issue(s) across ${combosRun} page/viewport/theme combinations.`);
  console.log(`Report: ${path.relative(ROOT, path.join(OUT, 'report.md'))}`);
  console.log(`Screenshots: ${path.relative(ROOT, SHOT_DIR)}/`);
  if (findings.length) {
    for (const f of findings) console.log(`  ${f.path} [${f.viewport}/${f.theme}] ${f.issues.join('; ')}`);
  }
}

main();
