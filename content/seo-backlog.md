# SEO content backlog

Candidate posts from the 25 Nov 2026 Semrush keyword research (T-25 of the
SEO programme). Longer-term, lower-priority than the certification guides
in Phase 4 of that programme — these target broader Kubernetes-fundamentals
queries rather than certification-specific ones. Nothing here is written
yet; each needs an outline approved before a draft starts, same as every
other new page in that programme.

Volume and KD (keyword difficulty, 0-100) are Semrush's US figures as of
25 Nov 2026 and will drift - re-check before committing to an outline.

| Keyword | Volume/mo | KD | Angle | Status |
|---|---|---|---|---|
| kind kubernetes | 1,600 | 44 | A practical kind (Kubernetes IN Docker) setup and first-cluster walkthrough - the local-dev entry point before anyone touches a real cluster. | backlog |
| kubernetes deployment | 1,600 | 36 | What a Deployment object actually controls (vs. ReplicaSet, Pod), a working YAML, and the rollout/rollback commands used day to day. | backlog |
| kubernetes interview questions | 1,300 | 40 | Real interview questions from the DevOps-engineer side of the table, grouped by seniority, with honest answers rather than a copy-pasted list. | backlog |
| kubernetes security best practices | 1,300 | 31 | A checklist actually run against production clusters: RBAC, network policies, pod security standards, image scanning - not a generic listicle. | backlog |
| kubernetes pods | 880 | 25 | The Pod as the real unit of scheduling: lifecycle, multi-container patterns (sidecar/init), and the failure modes that actually show up. | backlog |

## Notes

- Lower KD and higher volume should prioritise the order within this list
  when it's time to pick one up (same rule Phase 4's T-24 outreach plan
  uses), but nothing here is scheduled.
- Each post, when drafted, follows the same shape as every other Phase 4
  guide: a 2-3 sentence TL;DR at the top, question-style H2s, an "Updated"
  date, FAQ only where the questions are visible on the page, a
  BreadcrumbList, and links to the matching coupon page and
  `/kubestronaut/` where relevant.
- First-hand detail (which clusters this was actually run against, what
  broke) is what the research/competitors (devopscube, techiescamp) don't
  have - every outline should make space for it rather than reading as a
  summary of the official docs.
