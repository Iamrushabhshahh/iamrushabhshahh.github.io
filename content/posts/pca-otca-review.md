---
title: "Prometheus PCA and OpenTelemetry OTCA, reviewed"
description: "Two multiple-choice, $250 CNCF associate exams for observability: Prometheus PCA leans on PromQL, OTCA leans on the OpenTelemetry API and SDK. Here's an honest read on both, and which to take first."
date: "2026-08-30 09:00"
tags: [kubernetes, certification]
cover: /assets/blog/og/pca-otca-review.jpg
draft: false
---

Observability is most of my day job, Prometheus, Grafana, Loki, Tempo, and OpenTelemetry, so I get asked a lot about the two CNCF associate exams that cover this space: PCA (Prometheus Certified Associate) and OTCA (OpenTelemetry Certified Associate). Both are $250, both are 90-minute multiple choice, no live terminal for either, and both carry the CNCF official content badge. Here's an honest read on each.

## Prometheus Certified Associate, reviewed

PCA covers observability concepts, Prometheus fundamentals, PromQL, instrumentation and exporters, and alerting and dashboarding. The thing worth knowing going in: PromQL is the largest single domain on the exam, bigger than Prometheus fundamentals itself. That's a deliberate signal about what this credential actually certifies.

Being able to install Prometheus and point Grafana at it is not the same skill as being able to write a PromQL query from scratch to answer a real question about your metrics, and PCA is built to test the second one specifically. If your PromQL is mostly copy-pasted from dashboards you didn't write, that's exactly the gap this exam will find.

Linux Foundation designed it with a specific candidate in mind: people who already hold something like KCNA, CKA, or CKAD, or have a cloud engineering background. If that's you, the Kubernetes context makes the instrumentation and exporters domain click much faster than coming in cold.

## OpenTelemetry Certified Associate, reviewed

OTCA covers observability fundamentals, the OpenTelemetry API and SDK, the OpenTelemetry Collector, and maintaining and debugging observability pipelines. Here the weighting story is even more lopsided: the API and SDK domain alone makes up close to half the exam, well ahead of the Collector domain.

That tells you what OTCA actually validates: real instrumentation knowledge, not just the ability to write a Collector config. If your OpenTelemetry experience so far is "I deployed the Collector someone else configured," this exam is going to test territory you haven't actually touched yet. Exam-takers consistently report the Collector questions use realistic, practical config examples rather than abstract theory, so hands-on time with actual configuration stanzas matters more than reading the spec.

## Which to take first, and why

If your day-to-day already leans on metrics and dashboards, PCA is the natural first move: it validates knowledge you likely already have a head start on, and passing it builds confidence before you tackle OTCA's heavier SDK content. If you're doing greenfield instrumentation work, wiring traces and logs into a new service from scratch, OTCA maps more directly to what you're already doing day to day, and PCA becomes the complementary second exam once you've got metrics backend knowledge to pair with it.

Either order works. They're genuinely complementary rather than sequential: Prometheus handles metrics, OpenTelemetry adds traces and logs to the same picture, and most observability work eventually touches both.

`RUSHABH30` takes 30% off either exam, dropping each from $250 to about $175.

$ get [PCA for ~$175 →](/linux-foundation-coupon/pca/) or [OTCA for ~$175 →](/linux-foundation-coupon/otca/) with RUSHABH30. I'm an official Linux Foundation Education affiliate partner, so the code costs you nothing extra.
