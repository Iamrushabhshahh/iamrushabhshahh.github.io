# rushabhshah.dev

> Maintained by **Rushabh Shah** ([@iamrushabhshahh](https://github.com/iamrushabhshahh)) — see [MAINTAINERS.md](MAINTAINERS.md).

Personal site + markdown blog, served by GitHub Pages.

## How the blog works

- Posts are markdown files in `content/posts/`.
- `scripts/build-blog.mjs` renders them into static HTML under `blog/`, plus `blog/rss.xml` and `sitemap.xml`.
- `.github/workflows/publish-blog.yml` builds on every push **and hourly** — the hourly run is what makes scheduled publishing work. Generated files are committed back to `main`, and GitHub Pages serves them.

## Publishing a post

### From the browser (recommended)

1. Go to [app.pagescms.org](https://app.pagescms.org), sign in with GitHub, open this repo.
2. Create a post under **Blog posts** — rich editor, image uploads, all fields in a form (config lives in `.pages.yml`).
3. Save. It commits to `main`; the workflow builds and the post is live in ~2 minutes.

### From a text editor

Create `content/posts/my-post.md`:

```yaml
---
title: "My post title"
description: "One or two sentences shown in the list, search results, and RSS."
date: "2026-07-15 09:00"   # IST; quote it. Future date = scheduled.
tags: [kubernetes, observability]
draft: false                # true = never published, regardless of date
---

Markdown body here…
```

Push to `main`. Done.

### Scheduling

Set `date` to a future date/time (IST). The post is skipped by builds until that moment passes, then the next hourly run (at :10) publishes it automatically. Nothing else to do.

### Other frontmatter

- `cover:` image path (e.g. `/assets/blog/my-cover.jpg`) — used as the thumbnail in post lists, the hero image on the post, and the social-share (Open Graph) preview. Upload via Pages CMS or drop the file in `assets/blog/`.
- `featured: true` — pin the post at the top of `/blog/` (★ Pinned)
- `series:` name — posts sharing a series name get a linked "part 1/2/3" box at the top
- `slug:` override the URL (defaults to the filename)
- `updated:` last-modified date (shown to search engines)
- `canonical:` original URL when a post first appeared somewhere else

Tags are automatically browsable: every tag gets a `/blog/tags/<tag>/` page, and the blog index shows a tag cloud with counts. Posts scheduled within the next 90 days appear as a "coming soon" teaser on `/blog/`.

## Affiliate page

`/linux-foundation-coupon/` is a hand-authored static page (not generated) promoting the Linux Foundation Education partner code **RUSHABH30**. ⚠️ The CTA links still point at `training.linuxfoundation.org` directly — replace them with the AWIN tracking link (marked with a `TODO(rushabh)` comment in the file) or commissions won't be attributed.

### View counters

Views are tracked with [GoatCounter](https://rushabhshah.goatcounter.com). The visible "N views" counters (homepage footer + each post) use its public counter API — enable **Settings → Allow adding visitor counts on your website** in the GoatCounter dashboard or they stay hidden.

## Local preview

```sh
npm install
npm run build     # generates blog/, sitemap.xml
npm run serve     # http://localhost:8080
```

Never edit files under `blog/` or `sitemap.xml` by hand — they are generated and will be overwritten.
