# CKA exam day: PSI bridge, terminal, kubectl aliases

> The logistics nobody mentions until exam day: PSI Secure Browser setup, what the exam terminal actually gives you, kubectl aliases worth memorizing, and how to manage the clock.

Published: 2026-08-28 · Updated: 2026-08-28 · Tags: kubernetes, certification
Canonical: https://rushabhshah.dev/blog/cka-exam-day-setup/

Knowing the CKA domains cold and still losing time to exam-day logistics is a genuinely common way to hurt your own score. This is the setup and workflow side of it, meant to sit alongside [what the CKA actually tests](/blog/cka-exam-guide/).

## PSI bridge and secure browser setup

Linux Foundation exams are proctored remotely through PSI's secure browser, and the gotchas are almost always about the room and the machine, not the Kubernetes content:

- **Test your setup well before exam time**, not the morning of. Camera, microphone, and a stable, reasonably fast connection all matter, and a failed system check with no buffer left before your slot is a bad way to start.
- **Clear your desk and the room around you.** The proctor does a visual scan, and a second monitor, notes on the wall, or another device in view are common reasons for a delay or a flag.
- **Close everything except what you need.** Background apps, notification popups, and secondary monitors are typically restricted during the session; shut them down ahead of time instead of scrambling once the proctor asks.
- **Have your ID ready** and match the name you registered with. This sounds obvious until it's the thing that costs you ten minutes at the start.

## What the exam terminal actually gives you

Inside the proctored environment, you get a browser-based terminal connected to real clusters, plus access to the allowed official documentation (kubernetes.io). That's genuinely useful: you're not working from memory alone.

What you don't get is anything outside that sandbox: no personal notes, no copy-pasting from outside sources, no browsing beyond the permitted docs. If your prep leaned on external cheat sheets or a personal notes file, that crutch disappears the moment the exam starts. Practice using only what will actually be in front of you.

## kubectl aliases and shortcuts worth memorizing

The exam environment typically has `kubectl` pre-aliased to `k`, but set these up in your own practice environment beforehand so the muscle memory is already there on exam day:

```bash
alias k=kubectl
export do="--dry-run=client -o yaml"
export now="--force --grace-period 0"

# generate a Deployment manifest instead of hand-typing one
k create deploy nginx --image=nginx $do > deploy.yaml

# confirm which cluster you're actually working against
k config current-context
k config use-context <name>

# fast troubleshooting loop
k get pods -A
k describe pod <name>
k logs <name> --previous
```

The theme across all of these is the same: generate boilerplate instead of typing it, and always confirm which context you're in before you start a task. Both save real minutes, and minutes are the actual scarce resource in this exam.

## Time management across the exam's tasks

Two hours across multiple weighted tasks means the clock is as much a part of the exam as the Kubernetes knowledge is.

- **Scan everything before diving in.** A rough sense of which tasks are quick wins and which are heavier lets you sequence for points instead of solving in the order given.
- **Set a personal time cap per task**, and if you blow past it with no clear path forward, flag it and move on. A stuck twenty minutes on one task is a worse trade than two solved easier ones.
- **Verify before moving on.** A quick `kubectl get` or `describe` after each change confirms it actually landed, which is faster than discovering at the end that three tasks silently failed.
- **Leave a buffer at the end** to revisit flagged tasks rather than treating the full two hours as study-until-the-buzzer time.

`RUSHABH30` takes 30% off the CKA, dropping it from $445 to about $311. I'm an official Linux Foundation Education affiliate partner, so the code costs you nothing extra.

$ get [CKA for ~$311 with RUSHABH30 →](/linux-foundation-coupon/cka/)
