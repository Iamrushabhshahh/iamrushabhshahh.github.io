# My CNCF DevStats score is 178, and now I can't stop checking it

> A tiny tool turns your GitHub username into a CNCF contribution score. Mine came back 178. Here's what that number is actually made of, and how to check yours.

Published: 2026-08-20 · Updated: 2026-08-20 · Tags: open-source, cncf, meta
Canonical: https://rushabhshah.dev/blog/cncf-devstats-score/

Someone dropped [devstats.cluster.fun](https://devstats.cluster.fun/) in front of me today, a one-box tool by [Marcus Noble](https://github.com/AverageMarcus) that takes a GitHub username and returns your [CNCF DevStats](https://all.devstats.cncf.io/) contribution score. I typed in mine out of curiosity and, well, now I have a number I'm apparently allowed to be proud of: **178**.

## What the number is made of

Punch in a username and it hits the public DevStats API and hands back three numbers:

```json
{
  "contributions": 178,
  "issues": 16,
  "prs": 6
}
```

DevStats is the CNCF's own analytics project. It tracks activity across every CNCF-hosted repository (Kubernetes, containerd, Prometheus, and the rest of the landscape) and rolls commits, comments, reviews, issues, and PRs into a single contribution count. 178 isn't "178 pull requests," it's the weighted total of everything that counted as touching a CNCF project, of which 16 issues and 6 PRs are the visible tip.

## Why I'm sharing a number this small

Because context is the whole point. I'm not a top committer on any CNCF project, and this post isn't pretending otherwise. It's a small, honest number that reflects showing up, filing the issue instead of just complaining in a Slack thread, and sending the PR instead of waiting for someone else to. That's most people's real relationship with open source, and it's worth normalizing rather than only ever posting the maintainer-with-10,000-commits version of this stat.

If you've filed even one issue against a CNCF project, [go check your own score](https://devstats.cluster.fun/) and see what shows up. It's a nice five-second reminder of how much of "contributing to open source" is just doing the small unglamorous thing when you hit it, instead of scrolling past.
