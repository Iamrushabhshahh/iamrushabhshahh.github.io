# What the CKA actually tests in 2026

> The CKA is a live-terminal, performance-based exam against real clusters, not multiple choice. Here's the format, what it actually covers, how to practice, and where people lose time.

Published: 2026-08-26 · Updated: 2026-08-26 · Tags: kubernetes, certification
Canonical: https://rushabhshah.dev/blog/cka-exam-guide/

I run into a lot of confusion about what the CKA (Certified Kubernetes Administrator) exam is actually like, mostly from people picturing a multiple-choice test. It isn't one. Here's what you're actually walking into.

## Exam format

CKA is 100% performance-based: two hours, a live terminal, and a set of real Kubernetes clusters you complete hands-on tasks against, against the clock. There's no multiple-choice section anywhere in it. You're allowed to reference the official Kubernetes documentation (kubernetes.io) during the exam, which matters a lot for how you should prepare, more on that below.

## What it covers

The current curriculum groups the exam into cluster architecture, installation, and configuration; workloads and scheduling; services and networking; storage; and troubleshooting cluster and application issues. Troubleshooting is consistently the domain people underestimate, since it's less about knowing a command and more about diagnosing something that's already broken under time pressure.

Exact percentage weightings shift as the Linux Foundation and CNCF revise the curriculum periodically, so treat the domain list above as the shape of the exam rather than a fixed scorecard, and check their published curriculum for the current breakdown before you sit it.

## How to practice

The single biggest mistake I see is people studying CKA the way they'd study a multiple-choice exam: reading, note-taking, watching videos. That builds knowledge, but this exam tests speed and terminal fluency, which only comes from reps.

- **Killercoda** and similar browser-based scenario platforms let you practice realistic, timed tasks without provisioning anything locally.
- **Local kind or minikube clusters** are worth setting up early, so you can break things deliberately and fix them, which is closer to what the real exam asks than following a happy-path tutorial.
- **Real terminal reps matter more than reading.** Practice with the actual tools you'll have in the exam: kubectl, vim or nano, and the allowed documentation. If you're still looking up basic YAML structure mid-task during practice, you're not ready yet.

Since you're allowed to reference kubernetes.io live during the exam, practice *using* the docs under time pressure, not avoiding them. The skill isn't memorizing every flag, it's knowing exactly where to find what you need in under thirty seconds.

## Common failure points and time-management traps

- **Getting stuck on one question.** The exam gives you a fixed two hours across multiple tasks; a hard question that eats twenty minutes can cost you two easier ones later. Flag it, move on, come back if time allows.
- **Hand-writing YAML from scratch.** Generating boilerplate with `kubectl create ... --dry-run=client -o yaml` and editing from there is faster and less error-prone than typing a Deployment manifest by hand under pressure.
- **Not verifying your own work.** A task that looks done isn't necessarily graded as done. Get in the habit of running a quick `kubectl get` or `describe` after every change to confirm it actually took effect, especially before moving to the next task.
- **Losing track of context.** Multiple clusters means multiple contexts. Confirm `kubectl config current-context` before you start each task; solving the right problem on the wrong cluster still counts as wrong.

`RUSHABH30` takes 30% off the CKA, dropping it from $445 to about $311. I'm an official Linux Foundation Education affiliate partner, so the code costs you nothing extra.

$ get [CKA for ~$311 with RUSHABH30 →](/linux-foundation-coupon/cka/)
