---
title: "Example: a scheduled post (safe to delete)"
description: "This post demonstrates scheduled publishing — it stays invisible until its date/time passes, then the hourly build publishes it automatically."
date: "2099-01-01 09:00"
tags: [meta]
draft: false
---

If you can read this on the live site, scheduled publishing works — this file is dated `2099-01-01 09:00` IST and the build skipped it until then.

To schedule a real post: set `date` to any future date/time (IST). The hourly GitHub Actions build will publish it in the first run after that moment. Delete this file whenever you like.
