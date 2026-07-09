# rushabhshah.dev

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

- `slug:` override the URL (defaults to the filename)
- `updated:` last-modified date (shown to search engines)
- `canonical:` original URL for posts imported from Hashnode

## Local preview

```sh
npm install
npm run build     # generates blog/, sitemap.xml
npm run serve     # http://localhost:8080
```

Never edit files under `blog/` or `sitemap.xml` by hand — they are generated and will be overwritten.
