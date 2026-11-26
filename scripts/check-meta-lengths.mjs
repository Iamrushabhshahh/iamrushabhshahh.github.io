#!/usr/bin/env node
/**
 * Title/description length guard (T-07/T-08).
 *
 * Walks every built, indexable page the same way url-snapshot.mjs does and
 * checks <title> against Google's practical display limit and the meta
 * description against the range that avoids both truncation and padding.
 * Noindexed pages are skipped: nobody sees their snippet in search results.
 *
 *   node scripts/check-meta-lengths.mjs [root]
 *
 * Exits 1 (fails the build) on a title over 65 chars. A description outside
 * 110-160 only warns: it's a quality signal, not something that breaks
 * search presentation the way an overlong title does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv[2] ?? REPO);

const SKIP = new Set(['.git', 'node_modules', 'next', 'scripts', 'content', 'diagrams', '.venv', '.github', '.claude', 'assets', '_next', 'design']);

const pages = [];
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name), `${rel}${e.name}/`); }
    else if (e.name === 'index.html') pages.push({ url: rel, file: path.join(dir, e.name) });
  }
})(root, '/');

const pick = (html, re) => (html.match(re)?.[1] ?? '').trim();
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const fail = [], warn = [];
for (const { url, file } of pages.sort((a, b) => a.url.localeCompare(b.url))) {
  const html = fs.readFileSync(file, 'utf8');
  const robots = pick(html, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i);
  if (robots.includes('noindex')) continue;
  const title = decode(pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decode(pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i));
  if (title.length > 65) fail.push(`TITLE  (${title.length}) ${url}\n       ${title}`);
  if (description && !(110 <= description.length && description.length <= 160)) {
    warn.push(`DESC   (${description.length}) ${url}\n       ${description}`);
  }
}

console.log(`Checked ${pages.length} pages.`);
if (warn.length) console.log(`\nDescriptions outside 110-160 chars (${warn.length}), review these:\n  ${warn.join('\n  ')}`);
if (fail.length) { console.error(`\nFAILED: titles over 65 chars (${fail.length}):\n  ${fail.join('\n  ')}\n`); process.exit(1); }
console.log('\nMeta length check OK: no indexable title over 65 chars.');
