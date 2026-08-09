/* =====================================================================
   build-blog.mjs — markdown → static blog generator for rushabhshah.dev

   Reads   content/posts/*.md   (frontmatter: title, description, date,
                                 tags, draft, canonical, slug, cover,
                                 updated, featured, series)
   Writes  blog/index.html          post listing (pinned + coming soon + by year)
           blog/<slug>/index.html   individual posts
           blog/tags/<tag>/         per-tag listings
           blog/rss.xml             RSS 2.0 feed
           blog/posts.json          latest posts (for homepage widgets)
           sitemap.xml              regenerated with all live URLs

   Scheduling: a post whose `date` is in the future is skipped at build
   time. The GitHub Actions workflow rebuilds daily at 00:10 IST, so the
   post goes live automatically on the first run after its date/time
   passes (up to 24h later). Dates without an explicit timezone are
   treated as IST (+05:30).
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { marked } from 'marked';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const SITE = 'https://rushabhshah.dev';
const AUTHOR = 'Rushabh Shah';
const BLOG_TITLE = 'Rushabh Shah · Blog';
const BLOG_DESC = 'Articles on DevOps, Kubernetes, Docker, observability (Grafana LGTM stack, OpenTelemetry), cloud cost optimization, and Linux, by Rushabh Shah, Docker Captain & Grafana Champion.';

/* ---------- helpers ---------- */

const escapeHtml = (s = '') => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const escapeXml = escapeHtml;

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/['".]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Parse frontmatter date. Strings without a timezone are assumed IST (+05:30).
function parseDate(value) {
  if (value instanceof Date) return value; // YAML unquoted timestamps arrive as UTC Dates
  if (!value) return null;
  let s = String(value).trim().replace(' ', 'T');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    if (!/T/.test(s)) s += 'T00:00';
    s += '+05:30';
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const fmtDate = (d) => d.toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata',
});

const isoDate = (d) => d.toISOString();

const readingTime = (text) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

/* Last git commit date (YYYY-MM-DD) for a repo-relative path, ignoring this
   script's own bot commits — otherwise each bot commit that touches a stamped
   file (month rollover, dateModified) becomes the "latest" commit on the next
   run, which would push the date forward by a day forever instead of settling
   once. Falls back to null outside a git checkout. */
const gitLastMod = (relPath) => {
  try {
    const out = execFileSync('git', [
      'log', '-1', '--format=%cI',
      '--grep=chore(blog): publish generated pages', '--invert-grep',
      '--', relPath,
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
};

/* ---------- HTML → Markdown, for llms.txt-spec page mirrors ----------
   https://llmstxt.org proposes serving a clean markdown version of each page
   at the same URL with .md appended. Purpose-built for this site's own
   hand-authored markup (tailwind-style utility divs/spans, feather-icon <i>
   tags, FAQ <details>, pricing <table>s) rather than a general-purpose
   converter, so it stays a dependency-free ~40 lines instead of a full DOM. */

const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// Collapses ALL whitespace (including literal newlines from multi-line HTML
// source — a <p> in HTML doesn't preserve source line breaks, so neither
// should this) and drops the stray space that tag→space collapsing leaves
// before punctuation (e.g. "Rushabh Shah </span>." → "Rushabh Shah .").
const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ').replace(/ +([.,;:!?])/g, '$1').trim();

// A leading "#" in stripped text is sometimes literal authored content on
// this site (a terminal-comment design flourish, e.g. a stat label reading
// "# Docker Captains worldwide") rather than a real heading. Escape it so it
// isn't misread as one once it lands in a paragraph/blockquote/list item.
const escapeLeadingHash = (t) => t.replace(/^(#+)/, '\\$1');

const tableToMarkdown = (inner) => {
  const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(r => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => stripTags(c[1]).replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const [header, ...body] = rows;
  return `\n${[`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...body.map(r => `| ${r.join(' | ')} |`)].join('\n')}\n`;
};

function htmlFragmentToMarkdown(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '') // contact-form fields (incl. honeypot) aren't content
    .replace(/<img[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

  // <pre> (the terminal-window JSON snippet) needs its internal whitespace
  // preserved verbatim as a fenced code block — stash it behind a placeholder
  // so every whitespace-collapsing pass below leaves it untouched, then
  // restore it as the very last step.
  const codeBlocks = [];
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/^\n+/, '').replace(/\s+$/, '');
    codeBlocks.push(code);
    return `\n@@CODEBLOCK${codeBlocks.length - 1}@@\n`;
  });

  // Anchors wrapping a whole "card" (nested heading/paragraph/list/table, as
  // in this site's clickable tech-card links) read better unwrapped, with
  // the URL trailing as a note, than flattened into one inline [label](url).
  // Plain inline anchors still become normal markdown links.
  s = s.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const url = href.startsWith('/') ? SITE + href : href;
    if (/<(h[1-6]|p|table|ul|ol)[\s>]/i.test(inner)) return `\n${inner}\n(${url})\n`;
    const label = stripTags(inner);
    return label ? `[${label}](${url})` : '';
  });
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (stripTags(t) ? `**${stripTags(t)}**` : ''));
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (stripTags(t) ? `*${stripTags(t)}*` : ''));
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => (stripTags(t) ? `\`${stripTags(t)}\`` : ''));
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // FAQ-style <details><summary>Q</summary><div>A</div></details>
  s = s.replace(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
    (_, q, a) => `\n**${escapeLeadingHash(stripTags(q))}**\n\n${escapeLeadingHash(stripTags(a))}\n`);

  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, body) => tableToMarkdown(body));

  s = s.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, body) =>
    `\n${[...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => `- ${escapeLeadingHash(stripTags(m[1]))}`).join('\n')}\n`);

  for (const level of [4, 3, 2, 1]) {
    s = s.replace(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'),
      (_, t) => `\n${'#'.repeat(level)} ${stripTags(t)}\n`);
  }

  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => `\n> ${escapeLeadingHash(stripTags(t))}\n`);
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${escapeLeadingHash(stripTags(t))}\n`);
  s = s.replace(/<time[^>]*>([\s\S]*?)<\/time>/gi, (_, t) => stripTags(t));

  // Anything left (bare <div>/<span> text runs never wrapped in a handled
  // tag above) still needs its multi-space/newline runs collapsed the same
  // way stripTags() does for handled tags.
  s = decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/[ \t]*\n[ \t]*/g, '\n').replace(/ {2,}/g, ' ');
  s = s.split('\n').map(l => l.replace(/^[ \t]+/, '')).join('\n'); // avoid 4-space code-block misreads
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  s = s.replace(/@@CODEBLOCK(\d+)@@/g, (_, i) => '```\n' + codeBlocks[Number(i)] + '\n```');
  return s + '\n';
}

// Region of a hand-authored page worth mirroring: from <main> through the
// LAST <footer> (the site chrome one) — skips any inner article-footer
// (e.g. the coupon page's share-links footer) that appears before it.
function extractMirrorRegion(html) {
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf('<footer');
  if (start === -1) return html;
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

/* ---------- load posts ---------- */

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`No posts directory at ${POSTS_DIR}`);
  process.exit(1);
}

const now = new Date();
const all = [];
const scheduled = [];

for (const file of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  if (data.draft === true) { console.log(`⏸  draft     ${file}`); continue; }

  const date = parseDate(data.date);
  if (!date) { console.warn(`⚠️  skipped   ${file} — missing/invalid date`); continue; }
  if (date > now) {
    scheduled.push({ file, date, title: data.title || file.replace(/\.md$/, '') });
    console.log(`⏰ scheduled ${file} — goes live ${date.toISOString()}`);
    continue;
  }

  const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
  all.push({
    slug,
    title: data.title || slug,
    description: data.description || '',
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
    canonical: data.canonical || `${SITE}/blog/${slug}/`,
    cover: data.cover || null, // site-relative path, e.g. /assets/blog/foo.jpg — used as thumbnail + og:image
    featured: data.featured === true, // pinned at the top of /blog/
    series: data.series ? String(data.series) : null, // posts sharing a series name get a linked series box
    date,
    updated: parseDate(data.updated) || date,
    html: marked.parse(content, { mangle: false, headerIds: true }),
    rawContent: content.trim(),
    minutes: readingTime(content),
  });
}

all.sort((a, b) => b.date - a.date);

/* ---------- shared page chrome ---------- */

const head = ({ title, description, url, ogType = 'website', published, updated, tags, image }) => {
  const ogImage = image ? (image.startsWith('http') ? image : `${SITE}${image}`) : `${SITE}/assets/og-image.jpg`;
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#010409">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${AUTHOR}">
    <link rel="canonical" href="${url}">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23010409'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-size='38' font-weight='700' fill='%2358a6ff'%3ER%3C/text%3E%3C/svg%3E">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_TITLE)}" href="${SITE}/blog/rss.xml">
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iamrushabhshahh">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImage}">
    ${ogType === 'article' ? `<meta property="article:published_time" content="${isoDate(published)}">
    <meta property="article:modified_time" content="${isoDate(updated)}">
    <meta property="article:author" content="${AUTHOR}">
    ${(tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"></noscript>
    <link rel="stylesheet" href="/style.css">
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>`;
};

const header = `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="hidden md:flex space-x-6 text-sm">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors">./about</a>
                <a href="/blog/" class="text-primary-color transition-colors" aria-current="true">./blog</a>
                <a href="/linux-foundation-coupon/" class="text-gray-400 hover:text-primary-color transition-colors">./deals</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
            </div>
            <button id="menu-btn" class="md:hidden" aria-controls="site-menu" aria-expanded="false" aria-label="Toggle navigation menu">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
        </nav>
        <div id="site-menu" class="hidden md:hidden bg-terminal-header/90 font-fira">
            <a href="/#about" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./about</a>
            <a href="/blog/" class="block py-2 px-4 text-sm text-primary-color">./blog</a>
            <a href="/linux-foundation-coupon/" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./deals</a>
            <a href="/#contact" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./contact</a>
        </div>
        <a href="/linux-foundation-coupon/" class="block bg-primary-color/10 border-b border-border-color text-center font-fira text-xs py-2 px-4 text-gray-300 hover:text-primary-color transition-colors">
            🎓 30% off all Linux Foundation certifications (CKA, CKAD, CKS…) with code <span class="text-primary-color font-bold">RUSHABH30</span> →
        </a>
    </header>`;

const footer = `
    <footer class="border-t border-border-color mt-10">
        <div class="container mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-fira text-gray-500">
            <p>&copy; ${now.getFullYear()} ${AUTHOR} · Designed &amp; built with care.</p>
            <div class="flex flex-wrap gap-4">
                <a href="https://github.com/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">GitHub</a>
                <a href="https://in.linkedin.com/in/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">LinkedIn</a>
                <a href="https://twitter.com/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">Twitter</a>
                <a href="/blog/rss.xml" class="hover:text-primary-color">RSS</a>
                <a href="/privacy/" class="hover:text-primary-color">Privacy</a>
                <a href="/linux-foundation-coupon/" class="hover:text-primary-color">30% off Linux Foundation ↗</a>
            </div>
        </div>
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const b = document.getElementById('menu-btn');
            const m = document.getElementById('site-menu');
            if (b && m) {
                b.addEventListener('click', () => {
                    const open = m.classList.contains('hidden');
                    m.classList.toggle('hidden', !open);
                    b.setAttribute('aria-expanded', String(open));
                });
            }
        });
    </script>
</body>
</html>`;

/* ---------- post pages ---------- */

const tagChip = (t) => `<span class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full">${escapeHtml(t)}</span>`;

// Linked variant — only for places NOT already wrapped in an <a> (post pages, tag cloud).
const tagLink = (t) => `<a href="/blog/tags/${slugify(t)}/" class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full hover:bg-primary-color/20 transition-colors">${escapeHtml(t)}</a>`;

// Discreet coupon-page footer link — only on posts tagged kubernetes,
// certification or docker, so it doesn't read as doorway behaviour on
// unrelated posts. Anchor text rotates so every post doesn't look identical.
const COUPON_FOOTER_TAGS = new Set(['kubernetes', 'certification', 'docker']);
const COUPON_FOOTER_ANCHORS = [
  '30% off the CKA, CKAD and CKS with code RUSHABH30',
  'a 30% discount code for Linux Foundation certifications',
  'save 30% on your next Kubernetes certification exam',
];
const couponFooterLink = (post, index) => {
  if (!post.tags.some(t => COUPON_FOOTER_TAGS.has(t.toLowerCase()))) return '';
  const anchor = COUPON_FOOTER_ANCHORS[index % COUPON_FOOTER_ANCHORS.length];
  return `<p class="font-fira text-sm text-gray-400 mt-5">Also: <a href="/linux-foundation-coupon/" class="text-primary-color hover:underline">${anchor}</a>.</p>`;
};

// Series box shown at the top of every post that belongs to a series.
const seriesBox = (post) => {
  if (!post.series) return '';
  const parts = all.filter(p => p.series === post.series).sort((a, b) => a.date - b.date);
  if (parts.length < 2) return '';
  return `<aside class="tech-card p-5 rounded-md mb-8">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># Series: ${escapeHtml(post.series)} · ${parts.length} parts</p>
                <ol class="font-fira text-sm" style="list-style: decimal inside; margin: 0; padding: 0;">
                    ${parts.map(p => p.slug === post.slug
                      ? `<li class="text-white font-semibold" style="margin-top: 0.4em;">${escapeHtml(p.title)} <span class="text-gray-500 font-normal">(you are here)</span></li>`
                      : `<li style="margin-top: 0.4em;"><a href="/blog/${p.slug}/" class="text-gray-400 hover:text-primary-color">${escapeHtml(p.title)}</a></li>`).join('\n                    ')}
                </ol>
            </aside>`;
};

for (const [postIndex, post] of all.entries()) {
  const url = `${SITE}/blog/${post.slug}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.updated),
    url,
    author: { '@type': 'Person', name: AUTHOR, url: SITE },
    keywords: post.tags.join(', '),
    ...(post.cover ? { image: `${SITE}${post.cover}` } : {}),
  };

  // Per-post view counter (GoatCounter public counter API) + copy-link button.
  // The counter stays invisible unless the API responds, so nothing breaks if
  // "Allow adding visitor counts" is off in the GoatCounter settings.
  const postScript = `<script>
    document.addEventListener('DOMContentLoaded', () => {
        const v = document.getElementById('post-views');
        if (v) fetch('https://rushabhshah.goatcounter.com/counter/' + location.pathname + '.json')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => {
                const n = (d.count || '').toString().replace(/\\s/g, ',');
                if (n) v.textContent = '· ' + n + ' views';
            })
            .catch(() => {});
        const c = document.getElementById('copy-link');
        if (c) c.addEventListener('click', () => {
            navigator.clipboard.writeText(c.dataset.url).then(() => {
                const t = c.textContent;
                c.textContent = 'Copied!';
                setTimeout(() => { c.textContent = t; }, 2000);
            }).catch(() => {});
        });
        const s = document.getElementById('native-share');
        if (s && navigator.share) {
            s.classList.remove('hidden');
            s.addEventListener('click', () => {
                navigator.share({ title: s.dataset.title, url: s.dataset.url }).catch(() => {});
            });
        }
    });
    </script>`;

  const html = `${head({ title: `${post.title} · ${AUTHOR}`, description: post.description, url, ogType: 'article', published: post.date, updated: post.updated, tags: post.tags, image: post.cover })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
            <p class="font-fira text-sm mb-8"><a href="/blog/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../blog</a></p>
            <header class="mb-10">
                <h1 class="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">${escapeHtml(post.title)}</h1>
                <div class="flex flex-wrap items-center gap-3 font-fira text-sm text-gray-400">
                    <time datetime="${isoDate(post.date)}">${fmtDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>${post.minutes} min read</span>
                    <span id="post-views"></span>
                    ${post.tags.length ? `<span aria-hidden="true">·</span> ${post.tags.map(tagLink).join(' ')}` : ''}
                </div>
                ${post.cover ? `<img src="${post.cover}" alt="" class="w-full rounded-xl border border-border-color mt-8" loading="eager" decoding="async">` : ''}
            </header>
            ${seriesBox(post)}
            <div class="post-prose">
${post.html}
            </div>
            <footer class="mt-12 pt-6 border-t border-border-color">
                <div class="flex flex-wrap items-center gap-3 font-fira text-sm">
                    <span class="text-gray-400">Share:</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="chip">X / Twitter</a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="chip">LinkedIn</a>
                    <button type="button" id="copy-link" class="chip" data-url="${url}">Copy link</button>
                    <button type="button" id="native-share" class="chip hidden" data-title="${escapeHtml(post.title)}" data-url="${url}">Share…</button>
                    <a href="/blog/rss.xml" class="chip">RSS</a>
                </div>
                <p class="font-fira text-sm text-gray-400 mt-5">Thanks for reading. <a href="/#contact" class="text-primary-color hover:underline">Say hi</a> if it was useful.</p>
                ${couponFooterLink(post, postIndex)}
            </footer>
        </article>
    </main>
${footer.replace('</body>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n${postScript}\n</body>`)}`;

  const dir = path.join(OUT_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  // llms.txt-spec markdown mirror, from the original markdown source (higher
  // fidelity than re-deriving it from the rendered HTML).
  const postMd = `# ${post.title}\n\n> ${post.description}\n\nPublished: ${isoDate(post.date).slice(0, 10)} · Updated: ${isoDate(post.updated).slice(0, 10)} · Tags: ${post.tags.join(', ') || 'none'}\nCanonical: ${url}\n\n${post.rawContent}\n`;
  fs.writeFileSync(path.join(dir, 'index.html.md'), postMd);

  console.log(`✅ built     /blog/${post.slug}/`);
}

/* ---------- blog index ---------- */

const postCard = (p, { pinned = false } = {}) => `
                    <a href="/blog/${p.slug}/" class="tech-card p-6 rounded-md group block${pinned ? ' pinned-card' : ''}">
                        <div class="flex flex-col sm:flex-row gap-5">
                            ${p.cover ? `<img src="${p.cover}" alt="" loading="lazy" decoding="async" class="w-full sm:w-44 h-36 sm:h-28 object-cover rounded-lg border border-border-color flex-shrink-0">` : ''}
                            <div class="flex flex-col min-w-0">
                                <div class="flex flex-wrap items-center gap-3 font-fira text-xs text-gray-400 mb-2">
                                    ${pinned ? `<span class="text-primary-color">★ Pinned</span><span aria-hidden="true">·</span>` : ''}
                                    <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
                                    <span aria-hidden="true">·</span>
                                    <span>${p.minutes} min read</span>
                                </div>
                                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary-color transition-colors">${escapeHtml(p.title)}</h3>
                                ${p.description ? `<p class="text-gray-400 text-sm leading-relaxed mb-3">${escapeHtml(p.description)}</p>` : ''}
                                ${p.tags.length ? `<div class="flex flex-wrap gap-2 mt-auto">${p.tags.map(tagChip).join(' ')}</div>` : ''}
                            </div>
                        </div>
                    </a>`;

const featured = all.filter(p => p.featured);
const unpinned = all.filter(p => !p.featured);

const byYear = new Map();
for (const p of unpinned) {
  const y = p.date.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(p);
}

// Tease posts scheduled within the next 90 days (title + date only, no link).
const NINETY_DAYS = 90 * 24 * 3600 * 1000;
const upcoming = scheduled
  .filter(s => s.date - now < NINETY_DAYS)
  .sort((a, b) => a.date - b.date)
  .slice(0, 3);

// Tag cloud with counts, biggest first.
const tagCounts = new Map();
for (const p of all) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const featuredSection = featured.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># pinned</h2>
                <div class="space-y-4">
                ${featured.map(p => postCard(p, { pinned: true })).join('')}
                </div>
            </section>` : '';

const upcomingSection = upcoming.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># coming soon</h2>
                <div class="space-y-2">
                ${upcoming.map(s => `
                    <p class="font-fira text-sm text-gray-400"><span class="text-green-color">⏰</span> ${escapeHtml(s.title)} <span class="text-gray-500">· ${fmtDate(s.date)}</span></p>`).join('')}
                </div>
            </section>` : '';

const tagCloudSection = sortedTags.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># browse by tag</h2>
                <div class="flex flex-wrap gap-2">
                    ${sortedTags.map(([t, n]) => `<a href="/blog/tags/${slugify(t)}/" class="chip">${escapeHtml(t)} <span class="text-gray-500">${n}</span></a>`).join('\n                    ')}
                </div>
            </section>` : '';

const yearSections = [...byYear.entries()].map(([year, posts]) => `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># ${year}</h2>
                <div class="space-y-4">
                ${posts.map(p => postCard(p)).join('')}
                </div>
            </section>`).join('');

const couponPromoSection = `
            <section class="mb-12">
                <a href="/linux-foundation-coupon/" class="tech-card p-5 rounded-md flex flex-col md:flex-row items-center justify-between gap-4 group block">
                    <span class="text-sm text-gray-300">🎓 Prepping for the CKA, CKAD or CKS? Code <span class="text-primary-color font-bold">RUSHABH30</span> takes 30% off every Linux Foundation certification, all year.</span>
                    <span class="btn btn-ghost flex-shrink-0">Get the discount →</span>
                </a>
            </section>`;

const indexBody = all.length === 0
  ? `<p class="text-gray-400 font-fira text-center py-12">No posts yet. First one is coming soon.</p>`
  : couponPromoSection + featuredSection + upcomingSection + yearSections + tagCloudSection;

const indexHtml = `${head({ title: BLOG_TITLE, description: BLOG_DESC, url: `${SITE}/blog/` })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="max-w-3xl mx-auto">
            <header class="mb-12">
                <h1 class="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                    <span class="gradient-text">Blog</span>
                </h1>
                <p class="font-fira text-sm text-gray-400"><span class="text-green-color">$</span> ls ~/blog · DevOps, Kubernetes, observability, cloud cost &amp; Linux. <a href="/blog/rss.xml" class="text-primary-color hover:underline">Subscribe via RSS</a>.</p>
            </header>
${indexBody}
        </div>
    </main>
${footer}`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);

const blogIndexMd = `# ${BLOG_TITLE}\n\n> ${BLOG_DESC}\n\n${all.length ? all.map(p =>
  `- [${p.title}](${SITE}/blog/${p.slug}/) (${isoDate(p.date).slice(0, 10)}): ${p.description}`).join('\n')
  : 'No posts yet.'}\n`;
fs.writeFileSync(path.join(OUT_DIR, 'index.html.md'), blogIndexMd);

console.log('✅ built     /blog/');

/* ---------- tag pages ---------- */

const TAGS_DIR = path.join(OUT_DIR, 'tags');
fs.rmSync(TAGS_DIR, { recursive: true, force: true }); // drop stale tags from renamed/deleted posts
for (const [tag] of sortedTags) {
  const tSlug = slugify(tag);
  const posts = all.filter(p => p.tags.includes(tag));
  const url = `${SITE}/blog/tags/${tSlug}/`;
  const tagHtml = `${head({ title: `Posts tagged “${tag}” · ${BLOG_TITLE}`, description: `All posts tagged ${tag}. ${BLOG_DESC}`, url })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="max-w-3xl mx-auto">
            <header class="mb-12">
                <p class="font-fira text-sm mb-6"><a href="/blog/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../blog</a></p>
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                    Tagged: <span class="gradient-text">${escapeHtml(tag)}</span>
                </h1>
                <p class="font-fira text-sm text-gray-400">${posts.length} post${posts.length === 1 ? '' : 's'}</p>
            </header>
            <div class="space-y-4">
            ${posts.map(p => postCard(p)).join('')}
            </div>
        </div>
    </main>
${footer}`;
  const dir = path.join(TAGS_DIR, tSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), tagHtml);

  const tagMd = `# Posts tagged "${tag}"\n\n${posts.map(p =>
    `- [${p.title}](${SITE}/blog/${p.slug}/) (${isoDate(p.date).slice(0, 10)}): ${p.description}`).join('\n')}\n`;
  fs.writeFileSync(path.join(dir, 'index.html.md'), tagMd);
}
if (sortedTags.length) console.log(`✅ built     /blog/tags/ (${sortedTags.length} tag page(s))`);

/* ---------- posts.json (for homepage widgets) ---------- */

fs.writeFileSync(path.join(OUT_DIR, 'posts.json'), JSON.stringify(
  all.slice(0, 6).map(p => ({
    title: p.title, description: p.description, url: `/blog/${p.slug}/`,
    date: isoDate(p.date), tags: p.tags, minutes: p.minutes, cover: p.cover,
  })), null, 2));

/* ---------- RSS ---------- */

// RSS's lastBuildDate is the last time feed CONTENT changed, not build time —
// using build time would leave `blog/rss.xml` dirty on every rebuild even
// when no post changed, forcing a commit (and a full Pages redeploy) daily.
const lastBuild = all.length ? new Date(Math.max(...all.map(p => +p.updated))) : now;

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BLOG_TITLE)}</title>
    <link>${SITE}/blog/</link>
    <description>${escapeXml(BLOG_DESC)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${all.slice(0, 20).map(p => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
      ${p.tags.map(t => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`).join('\n')}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), rss);
console.log('✅ built     /blog/rss.xml');

/* ---------- sitemap.xml ---------- */

const sitemapUrls = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'monthly', lastmod: gitLastMod('index.html') },
  { loc: `${SITE}/blog/`, priority: '0.9', changefreq: 'weekly', lastmod: all.length ? isoDate(all[0].updated).slice(0, 10) : null },
  { loc: `${SITE}/linux-foundation-coupon/`, priority: '0.9', changefreq: 'weekly', lastmod: gitLastMod('linux-foundation-coupon/index.html') },
  { loc: `${SITE}/privacy/`, priority: '0.2', changefreq: 'yearly', lastmod: gitLastMod('privacy/index.html') },
  ...all.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, priority: '0.8', lastmod: isoDate(p.updated).slice(0, 10) })),
  ...sortedTags.map(([t]) => {
    const tagPosts = all.filter(p => p.tags.includes(t));
    const lastmod = tagPosts.length ? isoDate(new Date(Math.max(...tagPosts.map(p => +p.updated)))).slice(0, 10) : null;
    return { loc: `${SITE}/blog/tags/${slugify(t)}/`, priority: '0.3', changefreq: 'weekly', lastmod };
  }),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => {
  const children = [
    `<loc>${u.loc}</loc>`,
    u.lastmod && `<lastmod>${u.lastmod}</lastmod>`,
    u.changefreq && `<changefreq>${u.changefreq}</changefreq>`,
    `<priority>${u.priority}</priority>`,
  ].filter(Boolean);
  return `  <url>\n${children.map(c => `    ${c}`).join('\n')}\n  </url>`;
}).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('✅ built     /sitemap.xml');

/* ---------- freshness stamp: coupon page ----------
   Coupon-query SERPs reward visible freshness. The hourly CI build re-stamps
   the coupon page's title and "Updated ..." line with the current month, so
   the page advertises this month's date forever with zero manual work. */

const MONTH_YEAR = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const couponPath = path.join(ROOT, 'linux-foundation-coupon', 'index.html');
if (fs.existsSync(couponPath)) {
  const c = fs.readFileSync(couponPath, 'utf8');
  const couponMod = gitLastMod('linux-foundation-coupon/index.html') || now.toISOString().slice(0, 10);

  /* Person node: the homepage copy is canonical (it carries award,
     hasCredential and image). Copy it verbatim onto the coupon page so two
     @id-identical nodes can never describe different people.
     The (?:(?!<\/script>)[^])*? guard is load-bearing: without it, the lazy
     [^]*? happily spans past this block's own </script> into a sibling
     <script> tag, so on a page with multiple JSON-LD blocks (FAQPage,
     BreadcrumbList, WebPage, then Person) it matches from the FIRST script
     tag through to Person's closing tag and swallows every block in between. */
  const PERSON_RE = /<script type="application\/ld\+json">(?:(?!<\/script>)[^])*?"@type":\s*"Person"(?:(?!<\/script>)[^])*?<\/script>/;
  const personBlock = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(PERSON_RE)?.[0];

  let stamped = c
    .replace(/(<title>Linux Foundation Coupon )\([^)]*\)/, `$1(${MONTH_YEAR})`)
    .replace(/Updated [A-Za-z]+ \d{4}/g, `Updated ${MONTH_YEAR}`)
    .replace(/last updated this page \([^)]*\)/, `last updated this page (${MONTH_YEAR})`)
    .replace(/("dateModified":\s*")[^"]*(")/, `$1${couponMod}$2`)
    .replace(/Last verified: [A-Za-z]+ \d{4}/g, `Last verified: ${MONTH_YEAR}`);
  if (personBlock) {
    // Replacer FUNCTION, not a string: a string replacement would interpret
    // any "$&"/"$'" etc. inside personBlock's JSON as a substitution pattern.
    stamped = stamped.replace(PERSON_RE, () => personBlock);
  } else {
    console.warn('⚠️  could not find the Person JSON-LD block on index.html — skipping Person sync on the coupon page');
  }
  if (stamped !== c) {
    fs.writeFileSync(couponPath, stamped);
    console.log(`✅ stamped   /linux-foundation-coupon/ (${MONTH_YEAR})`);
  }
  const bareLinks = (stamped.match(/href="https:\/\/training\.linuxfoundation\.org\//g) || []).length;
  if (bareLinks) {
    console.warn(`⚠️  ${bareLinks} untracked affiliate link(s) on /linux-foundation-coupon/ — replace with the AWIN URL`);
  }
}

/* ---------- inline CSS into standalone pages ----------
   Replaces the render-blocking <link href="/style.css"> on hand-authored pages
   with an inlined, minified <style> tag (first paint needs no CSS request).
   Idempotent: re-runs refresh the existing inlined tag from style.css. */

const cssMin = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')   // strip comments
  .replace(/\s+/g, ' ')               // collapse whitespace
  .replace(/ *([{};,]) */g, '$1')     // trim around structural chars
  .replace(/: /g, ':')                // trim after colons (safe: descendant-combinator spaces sit before the colon)
  .trim();

for (const page of ['linux-foundation-coupon/index.html', 'privacy/index.html']) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const styleTag = `<style data-inline-css>${cssMin}</style>`;
  // Replacer FUNCTION, not a string: the CSS contains "~$'" which a string
  // replacement would interpret as the $' substitution pattern (inserts the
  // rest of the document into the style tag).
  const next = html
    .replace(/<link rel="stylesheet" href="\/style\.css">/, () => styleTag)
    .replace(/<style data-inline-css>[\s\S]*?<\/style>/, () => styleTag);
  if (next !== html) {
    fs.writeFileSync(p, next);
    console.log(`✅ inlined   /${page.replace('/index.html', '/')} CSS (${Math.round(cssMin.length / 1024)} KiB)`);
  }
}

/* ---------- markdown mirrors for hand-authored pages ----------
   Runs after stamping/CSS-inlining above so the mirror reflects final content.
   https://llmstxt.org proposes a clean markdown version of every page at the
   same URL with .md appended (index.html.md for extensionless URLs). */

for (const page of ['index.html', 'linux-foundation-coupon/index.html', 'privacy/index.html']) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const md = htmlFragmentToMarkdown(extractMirrorRegion(html));
  const mdPath = p.replace(/index\.html$/, 'index.html.md');
  const existing = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : null;
  if (md !== existing) {
    fs.writeFileSync(mdPath, md);
    console.log(`✅ mirrored  /${mdPath.replace(ROOT + path.sep, '')}`);
  }
}

/* ---------- prune deleted posts from blog/ ---------- */

const liveSlugs = new Set([...all.map(p => p.slug), 'tags']);
for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory() && !liveSlugs.has(entry.name)) {
    fs.rmSync(path.join(OUT_DIR, entry.name), { recursive: true });
    console.log(`🗑  pruned    /blog/${entry.name}/`);
  }
}

console.log(`\nDone: ${all.length} published, ${scheduled.length} scheduled, ${byYear.size} year group(s).`);
