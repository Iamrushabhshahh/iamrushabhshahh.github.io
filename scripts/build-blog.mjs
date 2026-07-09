/* =====================================================================
   build-blog.mjs — markdown → static blog generator for rushabhshah.dev

   Reads   content/posts/*.md   (frontmatter: title, description, date,
                                 tags, draft, canonical, slug)
   Writes  blog/index.html          post listing (grouped by year)
           blog/<slug>/index.html   individual posts
           blog/rss.xml             RSS 2.0 feed
           blog/posts.json          latest posts (for homepage widgets)
           sitemap.xml              regenerated with all live URLs

   Scheduling: a post whose `date` is in the future is skipped at build
   time. The GitHub Actions workflow rebuilds hourly, so the post goes
   live automatically within the hour after its date/time passes.
   Dates without an explicit timezone are treated as IST (+05:30).
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const SITE = 'https://rushabhshah.dev';
const AUTHOR = 'Rushabh Shah';
const BLOG_TITLE = 'Rushabh Shah — Blog';
const BLOG_DESC = 'Articles on DevOps, Kubernetes, Docker, observability (Grafana LGTM stack, OpenTelemetry), cloud cost optimization, and Linux — by Rushabh Shah, Docker Captain & Grafana Champion.';

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
    scheduled.push({ file, date });
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
    date,
    updated: parseDate(data.updated) || date,
    html: marked.parse(content, { mangle: false, headerIds: true }),
    minutes: readingTime(content),
  });
}

all.sort((a, b) => b.date - a.date);

/* ---------- shared page chrome ---------- */

const head = ({ title, description, url, ogType = 'website', published, updated, tags }) => `<!DOCTYPE html>
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
    <meta property="og:image" content="${SITE}/assets/og-image.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iamrushabhshahh">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SITE}/assets/og-image.jpg">
    ${ogType === 'article' ? `<meta property="article:published_time" content="${isoDate(published)}">
    <meta property="article:modified_time" content="${isoDate(updated)}">
    <meta property="article:author" content="${AUTHOR}">
    ${(tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</head>`;

const header = `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="flex space-x-6 text-sm">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors hidden md:inline-block">./about</a>
                <a href="/#writing" class="text-gray-400 hover:text-primary-color transition-colors hidden md:inline-block">./writing</a>
                <a href="/blog/" class="text-primary-color transition-colors" aria-current="true">./blog</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
            </div>
        </nav>
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
            </div>
        </div>
    </footer>
</body>
</html>`;

/* ---------- post pages ---------- */

const tagChip = (t) => `<span class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full">${escapeHtml(t)}</span>`;

for (const post of all) {
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
  };

  const html = `${head({ title: `${post.title} · ${AUTHOR}`, description: post.description, url, ogType: 'article', published: post.date, updated: post.updated, tags: post.tags })}
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
                    ${post.tags.length ? `<span aria-hidden="true">·</span> ${post.tags.map(tagChip).join(' ')}` : ''}
                </div>
            </header>
            <div class="post-prose">
${post.html}
            </div>
            <footer class="mt-12 pt-6 border-t border-border-color flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p class="font-fira text-sm text-gray-400">Thanks for reading — <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="text-primary-color hover:underline">share this post</a> or <a href="/#contact" class="text-primary-color hover:underline">say hi</a>.</p>
                <a href="/blog/rss.xml" class="chip">RSS feed</a>
            </footer>
        </article>
    </main>
${footer.replace('</body>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</body>`)}`;

  const dir = path.join(OUT_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`✅ built     /blog/${post.slug}/`);
}

/* ---------- blog index ---------- */

const byYear = new Map();
for (const p of all) {
  const y = p.date.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(p);
}

const indexBody = all.length === 0
  ? `<p class="text-gray-400 font-fira text-center py-12">No posts yet — first one is coming soon.</p>`
  : [...byYear.entries()].map(([year, posts]) => `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># ${year}</h2>
                <div class="space-y-4">
                ${posts.map(p => `
                    <a href="/blog/${p.slug}/" class="tech-card p-6 rounded-md flex flex-col group block">
                        <div class="flex flex-wrap items-center gap-3 font-fira text-xs text-gray-400 mb-2">
                            <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
                            <span aria-hidden="true">·</span>
                            <span>${p.minutes} min read</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary-color transition-colors">${escapeHtml(p.title)}</h3>
                        ${p.description ? `<p class="text-gray-400 text-sm leading-relaxed mb-3">${escapeHtml(p.description)}</p>` : ''}
                        ${p.tags.length ? `<div class="flex flex-wrap gap-2 mt-auto">${p.tags.map(tagChip).join(' ')}</div>` : ''}
                    </a>`).join('')}
                </div>
            </section>`).join('');

const indexHtml = `${head({ title: BLOG_TITLE, description: BLOG_DESC, url: `${SITE}/blog/` })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="max-w-3xl mx-auto">
            <header class="mb-12">
                <h1 class="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                    <span class="gradient-text">Blog</span>
                </h1>
                <p class="font-fira text-sm text-gray-400"><span class="text-green-color">$</span> ls ~/blog — DevOps, Kubernetes, observability, cloud cost &amp; Linux. <a href="/blog/rss.xml" class="text-primary-color hover:underline">Subscribe via RSS</a>.</p>
            </header>
${indexBody}
        </div>
    </main>
${footer}`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);
console.log('✅ built     /blog/');

/* ---------- posts.json (for homepage widgets) ---------- */

fs.writeFileSync(path.join(OUT_DIR, 'posts.json'), JSON.stringify(
  all.slice(0, 6).map(p => ({
    title: p.title, description: p.description, url: `/blog/${p.slug}/`,
    date: isoDate(p.date), tags: p.tags, minutes: p.minutes,
  })), null, 2));

/* ---------- RSS ---------- */

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BLOG_TITLE)}</title>
    <link>${SITE}/blog/</link>
    <description>${escapeXml(BLOG_DESC)}</description>
    <language>en</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
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
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'monthly' },
  { loc: `${SITE}/blog/`, priority: '0.9', changefreq: 'weekly' },
  ...all.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, priority: '0.8', lastmod: isoDate(p.updated).slice(0, 10) })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('✅ built     /sitemap.xml');

/* ---------- prune deleted posts from blog/ ---------- */

const liveSlugs = new Set(all.map(p => p.slug));
for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory() && !liveSlugs.has(entry.name)) {
    fs.rmSync(path.join(OUT_DIR, entry.name), { recursive: true });
    console.log(`🗑  pruned    /blog/${entry.name}/`);
  }
}

console.log(`\nDone: ${all.length} published, ${scheduled.length} scheduled, ${byYear.size} year group(s).`);
