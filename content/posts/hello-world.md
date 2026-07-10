---
title: "Hello, world: the blog now lives on rushabhshah.dev"
description: "Why I moved my writing from Hashnode to my own domain, and how this markdown-powered blog with scheduled publishing works under the hood."
date: "2026-07-09 12:00"
tags: [meta, blog]
draft: false
---

After two years of publishing on Hashnode, my writing finally has a home on my own domain. This post is both a hello and a quick tour of how this blog works.

## Why move?

Every article I published was building `iamrushabhshahh.hashnode.dev`'s search presence instead of `rushabhshah.dev`'s. Owning the content, the URLs, and the reader relationship matters more every year, especially when AI assistants are increasingly the ones reading and summarizing your site.

## How it works

The setup is deliberately boring, which is the highest compliment in infrastructure:

- Posts are **markdown files** in the site's GitHub repo. No database, no CMS server.
- A small Node script renders them into static HTML that matches the site's design, plus an RSS feed and sitemap.
- **GitHub Actions rebuilds hourly**, so a post with a future `date` in its frontmatter goes live automatically at the scheduled time. Write today, publish Tuesday 9 AM.
- Editing happens either in any text editor, or from the browser through a git-backed CMS.

```yaml
# publishing a post is just frontmatter
title: "My next deep dive"
date: "2026-07-15 09:00"   # IST, goes live automatically
tags: [kubernetes, observability]
```

Zero servers, zero cost, everything version-controlled.

## What to expect here

The same things I care about at work and in the community: **Kubernetes, Docker, the Grafana LGTM stack, OpenTelemetry, cloud cost optimization, and Linux**, written the way I'd want to read them: reproducible, with real configs and honest trade-offs.

If that's your kind of content, [subscribe via RSS](/blog/rss.xml) or find me on [Twitter](https://twitter.com/iamrushabhshahh).

$ see you in the next post
