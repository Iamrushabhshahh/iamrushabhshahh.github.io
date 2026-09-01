---
title: "CKA vs CKAD vs CKS: which to take first"
description: "CKA, CKAD, and CKS all share the same live-terminal format and the same $445 price tag, but they certify very different jobs. Here's who each one is for and what order makes sense."
date: "2026-08-20 09:00"
tags: [kubernetes, certification]
cover: /assets/blog/og/cka-vs-ckad-vs-cks.jpg
draft: false
---

People ask me this constantly, usually phrased as "which Kubernetes cert should I get": CKA, CKAD, or CKS. The honest answer is that they're not really competing for the same slot. They share a format (live terminal, real clusters, no multiple choice) and a price ($445 list), but they certify three different jobs.

## Who each one is actually for

**CKA (Certified Kubernetes Administrator)** is for the person who keeps the cluster running: installation, upgrades, networking, storage, and troubleshooting when something breaks at 2 a.m. If your job title has "platform," "SRE," or "infrastructure" in it, this is the default starting point.

**CKAD (Certified Kubernetes Application Developer)** is for the person shipping workloads *to* a cluster someone else administers. It skips cluster-admin depth entirely and goes deep on the stuff developers actually touch: Deployments, ConfigMaps, Secrets, probes, and debugging a Pod that won't come up. If you write the app and someone else runs the cluster, this is the closer match, and you don't need CKA first.

**CKS (Certified Kubernetes Security Specialist)** is for hardening a cluster end to end: cluster and system hardening, minimizing microservice vulnerabilities, supply-chain security, and runtime detection with tools like Falco. It's the deepest of the three, and it's the only one with a real prerequisite.

## Where they overlap, and where they don't

All three are performance-based against live clusters, so the exam-taking *skill* transfers: speed with kubectl, comfort editing YAML under time pressure, knowing how to navigate the allowed documentation fast instead of memorizing it. CKA and CKAD both touch Services and Networking, since both administrators and developers need to reason about how traffic reaches a Pod.

Where they diverge is depth versus breadth. CKA spreads across the whole cluster lifecycle. CKAD narrows to the application layer but goes deeper there than CKA does. CKS narrows even further, to security, and assumes CKA-level cluster fluency as a starting point rather than teaching it again.

## Why CKS needs an active CKA

This is the one hard prerequisite in the group, and it's enforced at scheduling time, not just a suggestion: you cannot sit the CKS without holding a currently active CKA. It's the right call. Cluster hardening only makes sense once you're already fluent in how a cluster is put together, so CKS builds directly on CKA fluency instead of re-teaching it under a security lens.

## Recommended order by where you're starting

- **Already doing ops, platform, or SRE work:** CKA first. It's the credential hiring managers actually check for production Kubernetes roles, and it unlocks CKS later if you want it.
- **Shipping applications to a cluster someone else runs:** CKAD, and you can stop there if cluster administration genuinely isn't your job. No need to detour through CKA first.
- **Security-focused, or aiming for the full track:** CKA, then CKS. If you're going for all five Kubestronaut certifications eventually, KCNA and KCSA (both multiple choice, no prerequisites) are the fastest wins to bank early, then CKA, CKAD, and CKS in whatever order fits your study time, with CKS last since it needs CKA active.

There's no wrong answer here as long as it matches what you actually do or want to do day to day. The expensive mistake is picking based on which one sounds most impressive rather than which one matches the job.

Whichever you pick, `RUSHABH30` takes 30% off any of them: [CKA](/linux-foundation-coupon/cka/), [CKAD](/linux-foundation-coupon/ckad/), [CKS](/linux-foundation-coupon/cks/), or the full [Kubestronaut bundle](/linux-foundation-coupon/kubestronaut/) if you're doing all three plus KCNA and KCSA. I'm an official Linux Foundation Education affiliate partner, so using the code costs you nothing extra and helps fund the meetups I run.

$ pick the one that matches the job, not the one that sounds best on LinkedIn
