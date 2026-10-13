#!/usr/bin/env node
/**
 * URL snapshot guard for the redesign (and every deploy after it).
 *
 * Walks every built page under a site root and records what search engines
 * and shared links depend on:
 *
 *   url          the path the page is served at
 *   canonical    <link rel="canonical">
 *   robots       <meta name="robots">
 *   title        <title>
 *   description  <meta name="description">
 *   ldTypes      every JSON-LD @type on the page, sorted
 *   go           for /go/ short links, the meta-refresh target
 *
 *   node scripts/url-snapshot.mjs --write [root]   record the baseline
 *   node scripts/url-snapshot.mjs [root]           compare against it
 *
 * Compare mode FAILS (exit 1) when a URL disappears, or a canonical, robots
 * value or /go/ target changes, or a page loses a JSON-LD type it had. Those
 * are the changes that cost rankings or money. Title and description changes
 * only WARN, because a redesign may improve them on purpose, but every one is
 * listed so none slips through unnoticed.
 *
 * Root defaults to the repo root, which in CI is the assembled site (the
 * generator's output plus the Next routes rsynced in).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(REPO, 'scripts', 'url-snapshot.json');
const args = process.argv.slice(2);
const write = args.includes('--write');
const root = path.resolve(args.find(a => !a.startsWith('--')) ?? REPO);

// Source folders and local preview helpers that are not part of the site.
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
function ldTypes(html) {
  const types = new Set();
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      (function collect(n) {
        if (Array.isArray(n)) return n.forEach(collect);
        if (n && typeof n === 'object') { if (n['@type']) [].concat(n['@type']).forEach(t => types.add(t)); Object.values(n).forEach(collect); }
      })(JSON.parse(m[1]));
    } catch { types.add('INVALID_JSON'); }
  }
  return [...types].sort();
}

const snap = {};
for (const { url, file } of pages.sort((a, b) => a.url.localeCompare(b.url))) {
  const html = fs.readFileSync(file, 'utf8');
  snap[url] = {
    canonical: pick(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
    robots: pick(html, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i),
    title: decode(pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    description: decode(pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i)),
    ldTypes: ldTypes(html),
    ...(url.startsWith('/go/') ? { go: decode(pick(html, /http-equiv="refresh"[^>]+content="0;url=([^"]*)"/i)) } : {}),
  };
}

if (write) {
  fs.writeFileSync(BASELINE, JSON.stringify(snap, null, 1) + '\n');
  console.log(`Snapshot written: ${Object.keys(snap).length} URLs -> ${path.relative(REPO, BASELINE)}`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) { console.error('No baseline. Run with --write first.'); process.exit(1); }
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const fail = [], warn = [];
for (const [url, b] of Object.entries(base)) {
  const n = snap[url];
  if (!n) { fail.push(`REMOVED   ${url}`); continue; }
  for (const k of ['canonical', 'robots', 'go']) if ((b[k] ?? '') !== (n[k] ?? '')) fail.push(`${k.toUpperCase().padEnd(9)} ${url}\n            was: ${b[k] || '(none)'}\n            now: ${n[k] || '(none)'}`);
  const lost = b.ldTypes.filter(t => !n.ldTypes.includes(t));
  if (lost.length) fail.push(`JSON-LD   ${url} lost ${lost.join(', ')}`);
  if (n.ldTypes.includes('INVALID_JSON')) fail.push(`JSON-LD   ${url} has a block that does not parse`);
  for (const k of ['title', 'description']) if (b[k] !== n[k]) warn.push(`${k.padEnd(11)} ${url}\n            was: ${b[k]}\n            now: ${n[k]}`);
}
const added = Object.keys(snap).filter(u => !base[u]);

console.log(`Compared ${Object.keys(base).length} baseline URLs against ${Object.keys(snap).length} built.`);
if (added.length) console.log(`\nNew URLs (${added.length}), add them to the baseline with --write once reviewed:\n  ${added.join('\n  ')}`);
if (warn.length) console.log(`\nChanged titles/descriptions (${warn.length}), check these are intended:\n  ${warn.join('\n  ')}`);
if (fail.length) { console.error(`\nFAILED (${fail.length}):\n  ${fail.join('\n  ')}\n`); process.exit(1); }
console.log('\nURL snapshot OK: no URL removed, no canonical, robots, /go/ target or JSON-LD type lost.');
