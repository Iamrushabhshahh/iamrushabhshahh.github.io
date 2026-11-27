# SEO content backlog

Volume and KD (keyword difficulty, 0-100) are Semrush's US figures as of
25 Nov 2026 and will drift - re-check before committing to an outline.
Nothing in this file is written yet; each post needs its own outline
approved before a draft starts, same as every other new page in the SEO
programme.

## GitOps and observability (T-24), approved priority order

Rushabh's own expertise (GitOps in production, the Grafana LGTM stack) -
good odds of ranking given the low KD on several of these. Approved order,
lowest difficulty and highest volume first; not yet drafted.

| # | Keyword(s) | Volume/mo | KD | Angle | Status |
|---|---|---|---|---|---|
| 1 | what is gitops | 880 | 11 | A practitioner's definition, not the vendor-marketing one - what GitOps actually changes about how you ship. | backlog |
| 2 | prometheus node exporter | 480 | 20 | What it exposes, a real production config, and the metrics actually worth alerting on. | backlog |
| 3 | gitops vs devops | 390 | 26 | They're not competing practices - GitOps is how you implement a DevOps delivery pipeline, not an alternative to it. | backlog |
| 4 | prometheus blackbox exporter | 260 | 27 | Black-box probing (HTTP/TCP/ICMP) alongside node_exporter's white-box metrics, with the config that catches real outages. | backlog |
| 5 | kube-prometheus-stack, kube prometheus stack helm chart | ~1,320 combined | 28 | The Helm chart in production: what each sub-chart does, the values worth overriding, upgrade gotchas. | backlog |
| 6 | gitops principles | 260 | n/a | The actual principles (declarative, versioned, pulled not pushed, continuously reconciled) with a production example of each. | backlog |

Held back for later (higher KD, same cluster): prometheus with grafana
(KD 39), loki grafana, prometheus alertmanager, what is grafana (KD 55).

## Kubernetes fundamentals (T-25)

Longer-term, lower-priority than the certification guides in Phase 4 and
the GitOps/observability cluster above - these target broader
Kubernetes-fundamentals queries rather than certification-specific or
GitOps-specific ones.

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
