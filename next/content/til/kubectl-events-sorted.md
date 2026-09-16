---
title: kubectl get events is useless until you sort it
slug: kubectl-events-sorted
date: 2026-09-16
category: k8s
takeaways:
  - "`kubectl get events` returns in arbitrary order, so the line you need is rarely at the bottom."
  - "Sorting by `.lastTimestamp` is the difference between reading events and scrolling past them."
codeSnippet:
  lang: bash
  caption: The only form worth aliasing
  code: |
    kubectl get events --sort-by=.lastTimestamp -A
---

The default output order for `kubectl get events` is not chronological, which
means during an incident the most recent event is somewhere in the middle of the
list. Sorting by `.lastTimestamp` fixes it, and `-A` catches the case where the
failure is in a namespace you were not looking at.
