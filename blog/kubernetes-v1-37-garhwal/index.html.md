# Kubernetes v1.37 (Garhwal): 52 forts, 67 changes, and what actually breaks

> A complete, plain-language guide to Kubernetes v1.37 Garhwal: every Stable graduation, the Beta features now on by default, working YAML for the ones you'll use, and the four changes that can stop your upgrade dead.

Published: 2026-08-26 · Updated: 2026-08-26 · Tags: kubernetes, releases
Canonical: https://rushabhshah.dev/blog/kubernetes-v1-37-garhwal/

Kubernetes v1.37 is called **Garhwal** (गढ़वाल). I read that and stopped for a second.

Release names usually slide past me. This one I already knew, and not from a map.

Years ago I was close to someone from Doiwala, a town just outside Dehradun. Doiwala sits in Dehradun district, and Dehradun district sits inside the Garhwal (गढ़वाल) division of Uttarakhand. So for a stretch of time I got a second-hand education in a place I had never been. The food, the words, the way people from the hills talk about the hills, like a person rather than a location. People from that part of Uttarakhand call themselves **pahari** (पहाड़ी), which means something close to "of the mountains", and once you hear how they say it you understand it isn't only geography.

A couple of years ago, in my last few days of college, some friends and I were presenting a [drone project](https://ijsrem.com/download/foni-drone) we had built together. Genuinely brilliant people, that team. And then one of the components went missing.

Which is how I ended up in the security office at Parul University, asking someone to scrub through camera footage with me. Already sitting there, waiting on the same tapes, was a person who had lost something of their own that day. Theirs mattered a great deal more than a drone part.

So we got talking, because there is not much else to do while a guard fast-forwards through six hours of grainy corridor footage.

We became good friends after that, and spent a good stretch of time in each other's company. Somewhere in there I picked up the pahari side of things properly. The culture, the food, a pile of Garhwali songs on YouTube that are still sitting in my watch history.

Everything has an expiry date, though.

We are not in touch any more. Nothing dramatic happened. College ended, I got busy with work and life and all the rest of it, and two people's lives simply stopped overlapping, the way they do.

So if this ever finds its way to you, my friend: those were good memories, and the trip is still on my list.

That's the honest reason this release landed differently for me. Garhwal has sat in my bucket list for years and I still haven't gone. This week the Kubernetes project put the name on a release, which is the closest I have come to visiting.

I'll take it.

## What Garhwal (गढ़वाल) actually is

Uttarakhand has two administrative divisions. Kumaon (कुमाऊं) is one. Garhwal is the other, and it covers seven districts: Chamoli, Dehradun, Haridwar, Pauri Garhwal, Rudraprayag, Tehri Garhwal and Uttarkashi.

The name comes from forts. *Garh* (गढ़) means fort, and the region takes its name from the [52 garhs](https://en.wikipedia.org/wiki/Garhwal_kingdom#52_garh_of_Garhwal) that were brought together into a single kingdom around the 14th century. Fifty-two separate strongholds, each with its own chief, folded into one thing that held.

I am not going to pretend that isn't a good accident for a release carrying 67 independent enhancements.

The language isn't one thing either. Garhwali (गढ़वाली) has roughly thirteen dialects depending on which valley you are standing in. Srinagaria, around Srinagar in Pauri, is the literary standard. Tehriyali runs through the Bhagirathi valley, Gangadi through Uttarkashi, Bangani out west where Garhwal starts turning into Himachal. Jaunsari, spoken by the Jaunsari community in Jaunsar-Bawar in Dehradun district, sits right on that bridge. Go east into Kumaon and it changes again, until the dialects near the border start sounding like western Nepal.

Thirteen dialects, one language. Fifty-two forts, one kingdom. It's a fitting name for a project built by a couple of thousand people who mostly don't agree with each other.

<figure class="figure-plain">
  <img src="/assets/blog/kubernetes-1-37-garhwal-logo.svg" alt="The Kubernetes v1.37 Garhwal release logo: terraced fields climbing towards snow-capped Himalayan peaks, a river winding past a mountain house, deodar forest, prayer flags, a Himalayan monal, and red buransh flowers with Kubernetes helms at their centres." width="420" height="404" loading="lazy" decoding="async">
  <figcaption>The frame is ringaal, a dwarf Himalayan bamboo used for basket weaving. A single strip bends; interlaced, they hold. The release team picked it on purpose.</figcaption>
</figure>

Whoever made this did the homework. The bird is a Himalayan [monal](https://en.wikipedia.org/wiki/Himalayan_monal), Uttarakhand's state bird. The red flowers are buransh, the state tree, with Kubernetes helms where the centres should be. The terraced fields climb the way they actually climb there. The house is marked १.३७ in Devanagari. It also animates, and more than I first noticed. The prayer flags catch the wind, the river shimmers on its own ten second cycle, and the whole valley runs a 37 second day-to-night loop: the light drains out around fifteen seconds in, the stars come out, and dawn arrives by the end. Four keyframe sets, thirty animations running at once, because every flag and every star gets its own. The version on kubernetes.io switches all of it off for anyone whose system asks for reduced motion, which is a thoughtful touch; the copy here always runs.

Right. Since I'm visiting Garhwal through a changelog, I may as well do the thing I'd want done for me and take the 67 changes apart in a way that still holds up when you're reading it in the middle of a chaotic day 😅, with YAML where it genuinely helps.

Although let's be honest, most of us don't write YAML from scratch any more. The AI does that part now. One of my recent CFP submissions is about exactly that, and if it gets picked I'll write it up properly. Fingers crossed.

Anyway. On to the release notes, and the postmortem ☺️

## The short version

If you close this tab now, take these:

| What changed | Stage | Why you care |
| --- | --- | --- |
| HPA can scale to zero | Beta, **on** | Idle GPU and queue workloads can go to nothing. Needs an external metric. |
| Gang scheduling | Beta | All-or-nothing placement for training jobs. No more 40-of-64 deadlocks. |
| API server cache warms ~55% faster | Stable + Beta, on | Large clusters recover far quicker. Handle HTTP 429 in your controllers. |
| Memory QoS | Beta, **on** | cgroups v2 memory protection and throttling. Defaults are safe. |
| PVC "unused since" | Beta, **on** | Finally find the disks nobody has mounted since March. |
| Pod certificates | Stable | Built-in workload identity without a mesh. |
| KYAML | Stable | YAML without the foot-guns. Nothing to migrate. |
| `metrics.k8s.io` v1 | Stable | Nine years in Beta. `kubectl top` sits on a stable API. |
| **SELinux volume mounting** | Stable, **on** | **Can stop pods starting.** The one that ruins upgrades. |
| **Old cAdvisor kubelet flags** | Removed | **Kubelet refuses to start.** Grep your config first. |
| `eventRecordQPS: 0` | Changed | Now means unlimited, not default. Set 50 if you meant the old thing. |
| `scheduling.k8s.io/v1alpha2` | Removed | Delete those objects *before* upgrading, not after. |
| kube-dns, ipvs, cgroups v1 | Deprecated | Nothing breaks today. All of it breaks eventually. |

The bold rows are the ones that can bite you. They're covered in full further down.

## An honest triage

16 went Stable, 23 went Beta, 27 are brand new in Alpha, and one thing got deprecated.

Every release write-up lists all 67 and leaves you to figure out which ones are your problem. That's not useful. Most of those 67 are invisible to you.

Before the triage, the one bit of vocabulary the whole post leans on:

<figure>
  <img src="/assets/blog/k8s-137-alpha-beta-stable.svg" alt="A three-step ladder. Alpha: off by default, can change or vanish next release, 27 in v1.37. Beta: mostly works and the API is settling, some are now on by default, 23 in v1.37. Stable: finished and supported, safe to build on, 16 in v1.37." width="860" height="528" loading="lazy" decoding="async">
  <figcaption>The middle step is where upgrades bite. Beta used to mean "off unless you ask for it". It doesn't always mean that any more.</figcaption>
</figure>

That middle box is the whole reason upgrade notes exist. A feature going Beta *and* getting flipped on by default means your cluster's behaviour changes without you asking for it. Several of those happened this release.

Want to know what's actually switched on in your cluster right now?

```bash
# every feature gate the API server is running, and its state
kubectl get --raw /metrics | grep '^kubernetes_feature_enabled' \
  | grep -E 'HPAScaleToZero|MemoryQoS|SELinuxMount'
```

So: four features you'll actually notice, four things that can break, and a deprecation list for next quarter's roadmap.

## The one I'd turn on first

HorizontalPodAutoscaler can finally scale to zero.

Until now the autoscaler could take you down to one pod and no further. One idle pod sounds like a rounding error, right up until it's a pod holding a GPU. Then it's the whole bill.

There's a catch, and it's the part people get stuck on, so here it is drawn out:

<figure>
  <img src="/assets/blog/k8s-137-scale-to-zero.svg" alt="Two rows. Top row, scaling on CPU: zero pods running means no CPU reading, which means nothing to scale up from, so the workload is stuck at zero forever. Bottom row, scaling on queue depth: zero pods running, the queue still reports 12 jobs waiting because it lives outside the cluster, so the HPA wakes the workload up to 3 pods." width="860" height="530" loading="lazy" decoding="async">
  <figcaption>Scale to zero only works on object and external metrics. Never on CPU or memory.</figcaption>
</figure>

CPU and memory readings come from running pods. Zero pods, zero readings, nothing to trigger a scale-up, workload parked forever. A queue length lives outside your cluster, so it keeps reporting whether you have pods or not. That's the signal that can wake something from the dead.

Here's the whole thing:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: batch-worker
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-worker
  minReplicas: 0        # the new bit. Before v1.37 this was rejected
  maxReplicas: 20
  metrics:
    - type: External    # External or Object only. CPU and memory cannot work here
      external:
        metric:
          name: queue_messages_ready
          selector:
            matchLabels:
              queue: batch-jobs
        target:
          type: AverageValue
          averageValue: "10"   # one pod per 10 queued messages
```

Kubernetes also stamps a `ScaledToZero` condition on the autoscaler while it's holding a workload at zero. Sounds like bookkeeping. It isn't. Without it, "the autoscaler parked this because nothing was queued" and "a human set replicas to 0 on purpose" look identical, and that ambiguity is exactly how workloads get restarted at 2am by something trying to be helpful.

```bash
kubectl get hpa batch-worker \
  -o jsonpath='{range .status.conditions[?(@.type=="ScaledToZero")]}{.status}{" "}{.reason}{"\n"}{end}'
# True  ScaledToZero        <- parked by the autoscaler
# False NotScaledToZero     <- back up and running
```

First proposed in v1.16, via [KEP-2021](https://github.com/kubernetes/enhancements/issues/2021). Six years to Beta.

## If you run AI training jobs, read this one
The default scheduler places pods one at a time. Fine for a web service. Actively bad for a 64-pod training job.

<figure>
  <img src="/assets/blog/k8s-137-gang-scheduling.svg" alt="One training job of 64 pods, shown two ways. Left, the default scheduler: 40 pods running and 24 pending, GPUs held, zero useful work. Right, gang scheduling: all 64 start together, or the whole group waits in the queue." width="860" height="460" loading="lazy" decoding="async">
  <figcaption>40 out of 64 is not 62% of a training job. It's zero training and 40 GPUs you're paying for.</figcaption>
</figure>

Forty pods scheduled, twenty-four pending, forty GPUs sitting there doing nothing while the job waits for room that may never come. Put two of those jobs on the same cluster and they can deadlock, each holding what the other needs.

Gang scheduling is all or nothing: a PodGroup gets placed only when there's room for every pod in it. [KEP-4671](https://github.com/kubernetes/enhancements/issues/4671) takes it to Beta and adds two things on top.

**Workload-aware preemption** ([KEP-5710](https://github.com/kubernetes/enhancements/issues/5710), also Beta) means that when the scheduler evicts lower-priority pods to make room, it evicts enough to actually let the workload run, instead of disrupting pods for nothing. And **PodGroup queueing** handles the livelock case where competing workloads keep tripping over each other without any of them making progress.

Alongside it, `batch/v1` Job picks up a `spec.scheduling` field ([KEP-5547](https://github.com/kubernetes/enhancements/issues/5547), Alpha) so a plain Job can opt into gang scheduling directly rather than going through a separate controller. Leave `spec.scheduling` off and the Job behaves exactly as it does today, so this is additive. Opt into Gang and `minCount` defaults to the Job's `parallelism`.

Two more that matter if you're building an ML platform:

- **`CompositePodGroup`** ([KEP-6012](https://github.com/kubernetes/enhancements/issues/6012), Alpha) describes a workload as a *hierarchy* of groups instead of one flat set of pods, which is what a real multi-stage pipeline actually looks like.
- **DRA ResourceClaims for workloads** ([KEP-5729](https://github.com/kubernetes/enhancements/issues/5729), Beta) lets a claim be shared across a whole PodGroup rather than reserved per pod.

If your platform team is running a custom scheduler purely for gang semantics, this is the thing that eventually replaces it.

## The boring one that matters most

Nothing about this is exciting and it's probably the biggest operational win in the release.

<figure>
  <img src="/assets/blog/k8s-137-apiserver-startup.svg" alt="Before: etcd sends one giant blob, the API server builds it fully in memory first, then a single decoder handles one event at a time while everything queues. In v1.37: etcd 3.7 sends streamed chunks, each chunk is decoded as it arrives, and 10 workers decode in parallel and reorder before delivery. About 55% faster to warm the cache, benchmarked over 150,000 pods." width="860" height="484" loading="lazy" decoding="async">
  <figcaption>Three separate pieces of work that all land in the same release and compound.</figcaption>
</figure>

Three things happened at once.

**Resilient watchcache initialization** ([KEP-4568](https://github.com/kubernetes/enhancements/issues/4568)) went Stable, so a starting API server no longer hammers etcd with a flood of expensive list requests at the exact moment you need etcd most. It bounds the work and returns `429 Too Many Requests` for what it can't take.

If you write controllers or operators, this is your homework. Handle 429 properly: respect `Retry-After`, back off exponentially. Plenty of custom controllers don't, and this is the release where that starts showing.

**etcd RangeStream** ([KEP-5966](https://github.com/kubernetes/enhancements/issues/5966), Beta, on by default) means etcd streams results in chunks instead of building one enormous response in memory first. It needs etcd 3.7, which is what v1.37 now ships with by default. On older etcd the API server detects the missing RPC and quietly falls back to the old path, so nothing breaks.

**Concurrent watch decode** ([KEP-6178](https://github.com/kubernetes/enhancements/issues/6178)), which had been sitting in Beta and off since v1.31, is now on by default. Ten worker goroutines instead of one, with a collector putting events back in their original order before delivery.

Together: roughly **55% faster** to warm the cache on a 150,000 pod benchmark. Concurrent decode alone accounts for about 40% of that.

One trap. If you have a CRD with a conversion webhook, up to 10 conversions can now hit that webhook at once instead of one at a time. Same total number of calls, very different shape. If your webhook caps its own concurrency below 10, look at it before you upgrade.

## Smaller things worth knowing

**`kubectl top` finally sits on a stable API.** `metrics.k8s.io` spent **nine years** in Beta ([KEP-5207](https://github.com/kubernetes/enhancements/issues/5207)). Nine. It's v1 now. Nothing breaks, `v1beta1` keeps working through the transition, but that's one fewer beta API holding up something you depend on.

**KYAML is Stable** ([KEP-5295](https://github.com/kubernetes/enhancements/issues/5295)). A stricter subset of YAML that kills the classic foot-guns, the ones where `no` silently becomes `false`. The good part is that it's not a migration: every KYAML file is already valid YAML, so every version of kubectl already reads it.

```bash
kubectl get deploy/api -o kyaml
```

**PVCs now tell you they're unused** ([KEP-5541](https://github.com/kubernetes/enhancements/issues/5541), Beta, on by default). A new `Unused` condition flips to `True` when the last pod referencing a claim goes away, and the condition's `lastTransitionTime` doubles as an "unused since" timestamp. Kubernetes deliberately deletes nothing. It just tells you, and what you do about it is your call. Correct design.

Go find the money:

```bash
# every PVC nothing has mounted, oldest first
kubectl get pvc -A -o json | jq -r '
  .items[]
  | select(.status.conditions[]? | select(.type == "Unused" and .status == "True"))
  | [ (.status.conditions[] | select(.type == "Unused") | .lastTransitionTime),
      .metadata.namespace, .metadata.name, .spec.resources.requests.storage ]
  | @tsv' | sort
```

One caveat: the timestamp records when the controller noticed nothing was using the claim, not the exact moment the disk unmounted. The idle time it reports may run slightly short, never longer.

**Memory QoS went Beta and on by default** ([KEP-2570](https://github.com/kubernetes/enhancements/issues/2570)). Kubernetes now uses your memory requests and limits to set cgroups v2 controls (`memory.min`, `memory.low`, `memory.high`), protecting requested memory from reclaim and throttling a pod that's climbing towards its limit instead of letting it hit the wall and get OOM-killed. The defaults were chosen so upgrading doesn't start throttling anything unexpectedly.

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

# Memory QoS is on by default in v1.37. These are the two knobs.
memoryThrottlingFactor: 0.9   # where memory.high sits relative to the limit
# memoryReservationPolicy:    # new in v1.37: how much requested memory is
                              # protected from reclaim. Check the kubelet
                              # reference for the current values before setting it.
```

This needs cgroups v2, which is its own reason to read the deprecation section.

**Pod certificates and ClusterTrustBundles are Stable** ([KEP-4317](https://github.com/kubernetes/enhancements/issues/4317) and [KEP-3257](https://github.com/kubernetes/enhancements/issues/3257)). Built-in workload identity: a pod gets its own private key and X.509 certificate through a projected volume, plus the trust anchors needed to verify other workloads. You pick a signer name and run a signer controller that watches `PodCertificateRequest` objects and issues certificates for eligible pods.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: payments-api
spec:
  containers:
    - name: app
      image: registry.example/payments:2.4
      volumeMounts:
        - name: identity
          mountPath: /var/run/identity
          readOnly: true
  volumes:
    - name: identity
      projected:
        sources:
          # the pod's own key and certificate, refreshed by your signer controller
          - podCertificate:
              signerName: example.com/workload-identity
              keyType: ECDSAP256
              credentialBundlePath: creds.pem
          # the trust anchors needed to verify everyone else
          - clusterTrustBundle:
              signerName: example.com/workload-identity
              path: ca.crt
```

If you deployed a service mesh purely to get mTLS identity, this is the beginning of not needing to. Check the [projected volume docs](https://kubernetes.io/docs/concepts/storage/projected-volumes/) for the full field list before you wire it up.

**A `Recreate` update strategy for StatefulSets** ([KEP-3541](https://github.com/kubernetes/enhancements/issues/3541), Alpha). Deployments have had this forever; StatefulSets only had `OnDelete` and `RollingUpdate`. Delete every pod, then create the new ones.

```yaml
apiVersion: apps/v1
kind: StatefulSet
spec:
  updateStrategy:
    type: Recreate     # Alpha: needs the StatefulSetRecreateStrategy gate
```

And quickly: pod-level checkpoint and restore ([KEP-5823](https://github.com/kubernetes/enhancements/issues/5823), Alpha, and your container runtime has to implement the new CRI calls too), proper Node lifecycle conditions like `DrainInProgress` and `MaintenanceInProgress` so every tool stops guessing from taints and annotations ([KEP-5683](https://github.com/kubernetes/enhancements/issues/5683), Alpha), a faster nftables kube-proxy that talks netlink instead of shelling out to `nft` and can finally serve NodePort over localhost ([KEP-6032](https://github.com/kubernetes/enhancements/issues/6032)), and `maxUnavailable` for StatefulSets switched back on after the v1.36 bug that could pin a pod in CrashLoopBackOff forever.

## Now the part that can ruin your week

Straight from the changelog's "no, really, you MUST read this before you upgrade" section. Four of these, and one of them is nasty.

### 1. SELinux volume mounting

This is the big one, and only if you run SELinux. If you don't, skip to the next.

`SELinuxMount` and `SELinuxChangePolicy` ([KEP-1710](https://github.com/kubernetes/enhancements/issues/1710)) are Stable and on. Volumes now get mounted with an SELinux context rather than recursively relabelled, when the volume's CSI driver opts in via `.spec.seLinuxMount: true`. Here's what that does to you:

<figure>
  <img src="/assets/blog/k8s-137-selinux-breakage.svg" alt="Two pods with different SELinux labels sharing one volume. In v1.36 and earlier the volume is relabelled recursively and both pods start. In v1.37 the volume is mounted with one SELinux context, so Pod A starts and Pod B is refused and fails to start. Fix: set spec.seLinuxChangePolicy to Recursive on the pod." width="860" height="516" loading="lazy" decoding="async">
  <figcaption>A mount carries exactly one SELinux context. Two pods, two labels, one volume, and the second pod stops starting.</figcaption>
</figure>

Two pods with different SELinux labels sharing a volume on the same node used to work fine. Now the second one can just fail to start. Go looking for shared volumes before you upgrade, not after.

To keep the old behaviour for a specific workload:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: legacy-shared-volume
spec:
  seLinuxChangePolicy: Recursive   # opt back into pre-v1.37 relabelling
  containers:
    - name: app
      image: registry.example/app:1.0
      volumeMounts:
        - name: shared
          mountPath: /data
  volumes:
    - name: shared
      persistentVolumeClaim:
        claimName: shared-data
```

You can still disable it cluster-wide, but only for one more release. It locks in v1.38. Clusters without SELinux see no effect at all.

### 2. The `scheduling.k8s.io/v1alpha2` API is gone

Promoted to `v1alpha3`, and `v1alpha2` dropped outright. You have to **remove every v1alpha2 object from your API server before you upgrade**, not after. Only bites you if you were playing with the alpha workload-aware scheduling APIs, but if you were, this is a hard stop.

```bash
kubectl get --raw /apis/scheduling.k8s.io/v1alpha2 2>/dev/null \
  && echo "v1alpha2 still served here. Clean it out before upgrading."
```

### 3. `eventRecordQPS: 0` quietly changed meaning

It used to mean "use the default". Now it means what the docs always claimed: unlimited, no rate limit whatsoever. If you have a 0 in your kubelet config and you liked the old behaviour, say the number out loud.

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

# v1.37 fixed this: 0 now genuinely means "no limit", not "use the default".
# If you had 0 and wanted the old behaviour, this is what it was.
eventRecordQPS: 50

# Escape hatch for cgroups v1 nodes. Treat this as a countdown, not a fix.
failCgroupV1: false
```

Otherwise you have silently removed a rate limit and you'll find out during your next event storm.

### 4. Old cAdvisor kubelet flags now stop the kubelet from starting

Not a warning. The kubelet does not come up.

The embedded cAdvisor moved to a leaner module and a long list of deprecated flags is simply no longer accepted: `--containerd`, `--containerd-namespace`, `--container-hints`, `--boot-id-file`, `--machine-id-file`, `--global-housekeeping-interval`, `--application-metrics-count-limit`, `--enable-load-reader`, `--event-storage-age-limit`, `--event-storage-event-limit`, `--log-cadvisor-usage`, and the whole `--storage-driver-*` family. Only `--housekeeping-interval` survives.

```bash
DEAD='containerd|containerd-namespace|container-hints|boot-id-file|machine-id-file'
DEAD="$DEAD|storage-driver|global-housekeeping|application-metrics|event-storage"
DEAD="$DEAD|enable-load-reader|log-cadvisor-usage"

grep -rE -- "--($DEAD)" \
  /etc/systemd/system/kubelet* /etc/default/kubelet /var/lib/kubelet/ 2>/dev/null
```

Three metric series disappear with it: `container_cpu_load_average_10s`, `container_cpu_load_d_average_10s` and `container_tasks_state`, plus any custom `container_application_*` metrics. Check your dashboards and, more importantly, your alerts. An alert that silently stops firing is worse than one that breaks loudly.

Two smaller ones while you're in here. **Static pods can no longer reference Secrets or ConfigMaps**, which was always a bug, and the `PreventStaticPodAPIReferences` gate that let you opt out has been removed. And the kubelet now **logs its full effective configuration at startup**, so go look at who has access to the `nodes/logs` ClusterRole.

## The slow-motion deprecations

None of this breaks today. All of it breaks eventually.

**kube-dns.** CoreDNS has been the default since v1.13 and kube-dns never caught up: no EndpointSlices, no dual-stack Services. The subproject is already retired and no new packages are expected after v1.40. If you're still on it, that's a migration to schedule.

**kube-proxy's ipvs mode** ([KEP-5495](https://github.com/kubernetes/enhancements/issues/5495)). Added in v1.8 to work around iptables performance, but the kernel's ipvs API can't fully implement Kubernetes Services on its own, so ipvs mode has been quietly using iptables underneath the whole time. v1.37 logs a deprecation warning at startup, v1.40 turns it off by default, v1.43 removes it.

```bash
kubectl -n kube-system get configmap kube-proxy \
  -o jsonpath='{.data.config\.conf}' | grep 'mode:'
```

On a modern kernel you want nftables, GA since v1.33. On an older kernel, iptables is still the default and still fine. Note that kubeadm now warns if you haven't set `mode` explicitly, because the default is heading for nftables.

**cgroups v1** ([KEP-5573](https://github.com/kubernetes/enhancements/issues/5573)). Since v1.35 the kubelet refuses to start on a cgroups v1 node unless you set `failCgroupV1: false`. That override still works in v1.37. Treat it as a countdown: memory QoS and memory-backed volume resizing only exist on v2.

**`kubectl run --filename`.** Deprecated. The flag was ignored anyway, since `kubectl run` builds the pod purely from command-line arguments.

## Everything that graduated, in one place

Most write-ups either list all 67 changes or list four. Here's the complete Stable set, which is the part with the longest half-life, plus what each one actually gives you.

| Graduated to Stable | What it means |
| --- | --- |
| [KYAML](https://github.com/kubernetes/enhancements/issues/5295) | YAML subset without the foot-guns, `kubectl get -o kyaml` |
| [`metrics.k8s.io` API](https://github.com/kubernetes/enhancements/issues/5207) | `kubectl top` and HPA finally on a v1 API after nine years |
| [Resilient watchcache initialization](https://github.com/kubernetes/enhancements/issues/4568) | API server stops overloading etcd at startup |
| [Pod Certificates](https://github.com/kubernetes/enhancements/issues/4317) | Per-pod key and X.509 cert via projected volume |
| [ClusterTrustBundles](https://github.com/kubernetes/enhancements/issues/3257) | Distributing the trust anchors that verify them |
| [Node Declared Features](https://github.com/kubernetes/enhancements/issues/5328) | Nodes publish which gated features they support, for version skew |
| [Storage Version Migrator in-tree](https://github.com/kubernetes/enhancements/issues/4192) | Rewrite stored objects after an API or encryption change, declaratively |
| Speed up recursive SELinux label change | The mount-context behaviour described above |
| [DRA: device taints and tolerations](https://github.com/kubernetes/enhancements/issues/5055) | Mark individual devices unschedulable, or taint by rule |
| [DRA: extended resource requests via DRA driver](https://github.com/kubernetes/enhancements/issues/5004) | `example.com/gpu: 3` served by DRA, no device plugin needed |
| [DRA: ResourceClaim device status](https://github.com/kubernetes/enhancements/issues/4817) | Drivers report per-device state, including assigned IPs |
| [DRA: standard `numaNode` attribute](https://github.com/kubernetes/enhancements/issues/6072) | One attribute name for NUMA placement across every driver |
| Configurable tolerance for HPAs | Per-HPA tolerance instead of one cluster-wide value |
| Resource health status in Pod status | Device failures visible on the pod, not just in node logs |
| Arbitrary FQDN as a pod's hostname | Set the fully qualified hostname a workload sees |
| Relaxed validation for Service names | Fewer names rejected for no good reason |
| Condition for sandbox creation | A real signal for "the sandbox came up" |

Beta this cycle, roughly in the order you're likely to feel them. The last column is the one that matters: a Beta feature that is **on** changes your cluster whether you asked for it or not.

| Beta in v1.37 | KEP | Default |
| --- | --- | --- |
| HPA scale to zero | [2021](https://github.com/kubernetes/enhancements/issues/2021) | **on** |
| Memory QoS | [2570](https://github.com/kubernetes/enhancements/issues/2570) | **on** |
| PVC unused tracking | [5541](https://github.com/kubernetes/enhancements/issues/5541) | **on** |
| etcd RangeStream | [5966](https://github.com/kubernetes/enhancements/issues/5966) | **on** |
| Concurrent watch decode | [6178](https://github.com/kubernetes/enhancements/issues/6178) | **on** |
| Stale controller mitigation | [5647](https://github.com/kubernetes/enhancements/issues/5647) | **on**, per controller |
| Gang scheduling | [4671](https://github.com/kubernetes/enhancements/issues/4671) | gate |
| Workload-aware preemption | [5710](https://github.com/kubernetes/enhancements/issues/5710) | gate |
| DRA ResourceClaims for workloads | [5729](https://github.com/kubernetes/enhancements/issues/5729) | gate |
| Native histograms for metrics | [5808](https://github.com/kubernetes/enhancements/issues/5808) | gate |
| Manifest-based admission control | [5793](https://github.com/kubernetes/enhancements/issues/5793) | gate |
| Removing undecryptable resources | [3926](https://github.com/kubernetes/enhancements/issues/3926) | gate |
| Storage capacity scoring | [4049](https://github.com/kubernetes/enhancements/issues/4049) | off |
| CSI attach limits for Cluster Autoscaler | [5030](https://github.com/kubernetes/enhancements/issues/5030) | off |
| Watch-based route reconciliation | [5237](https://github.com/kubernetes/enhancements/issues/5237) | off |
| Pod-level resource managers | [5526](https://github.com/kubernetes/enhancements/issues/5526) | off |
| CRI-only container stats | [2371](https://github.com/kubernetes/enhancements/issues/2371) | off |

"gate" means the release notes don't state a default either way, so check the feature gate reference before assuming. I'd rather say that than guess on your behalf.

Alpha is where v1.38 and v1.39 come from, so this is a watch list rather than a to-do list. All of it is off by default.

| New in Alpha | KEP |
| --- | --- |
| Pod-level checkpoint and restore | [5823](https://github.com/kubernetes/enhancements/issues/5823) |
| `CompositePodGroup` for hierarchical workloads | [6012](https://github.com/kubernetes/enhancements/issues/6012) |
| Job `spec.scheduling` | [5547](https://github.com/kubernetes/enhancements/issues/5547) |
| Workload-aware scheduling controller APIs | [6089](https://github.com/kubernetes/enhancements/issues/6089) |
| DRA derived attributes | [6080](https://github.com/kubernetes/enhancements/issues/6080) |
| DRA device compatibility groups | [5963](https://github.com/kubernetes/enhancements/issues/5963) |
| DRA node-allocatable resource requests | [5517](https://github.com/kubernetes/enhancements/issues/5517) |
| Scheduler preemption for in-place pod resize | [5836](https://github.com/kubernetes/enhancements/issues/5836) |
| Resizing memory-backed volumes in place | [6030](https://github.com/kubernetes/enhancements/issues/6030) |
| Node lifecycle conditions | [5683](https://github.com/kubernetes/enhancements/issues/5683) |
| `Recreate` update strategy for StatefulSets | [3541](https://github.com/kubernetes/enhancements/issues/3541) |
| localhost NodePort proxy for nftables | [6032](https://github.com/kubernetes/enhancements/issues/6032) |

For the full 67 with every PR link, the [v1.37 changelog](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.37.md#changelog-since-v1360) is the source of truth.

## Does this touch the CKA?

Not really, no.

Cert curricula track Kubernetes on a lag, and the CKA tests concepts rather than release-specific feature gates. Nothing here changes how you write a Deployment or debug a pending pod.

The one habit worth forming now is nftables over ipvs, because that's clearly where kube-proxy is going. Beyond that, the exam lets you use the docs while you sit it, so being fast at looking things up beats memorising which feature landed in which version. I wrote up [what the CKA actually tests](/blog/cka-exam-guide/) if that's on your list.

## Try it this week

Three things, none of which need a maintenance window.

**1. Find the storage you're paying for and not using.** Run the `jq` one-liner above against a staging cluster. It takes ten seconds and it usually finds something.

**2. Pick one idle workload and set `minReplicas: 0`.** A queue consumer, a batch worker, anything driven by an external metric. Watch for the `ScaledToZero` condition. This is the single highest-value change in the release for most people's bills.

**3. Run the four pre-upgrade checks.** Before v1.37 goes anywhere near production:

```bash
# 1. dead cAdvisor flags that stop the kubelet booting
grep -rE -- '--(containerd|container-hints|boot-id-file|storage-driver)' \
  /etc/systemd/system/kubelet* /var/lib/kubelet/ 2>/dev/null

# 2. an eventRecordQPS of 0 that now means something else
grep -r 'eventRecordQPS' /var/lib/kubelet/config.yaml 2>/dev/null

# 3. which kube-proxy backend you're on, and how much ipvs runway you have
kubectl -n kube-system get configmap kube-proxy \
  -o jsonpath='{.data.config\.conf}' | grep 'mode:'

# 4. alpha scheduling objects that must be deleted before the upgrade
kubectl get --raw /apis/scheduling.k8s.io/v1alpha2 2>/dev/null
```

And if you run SELinux, go find volumes shared between pods with different labels. That's the one that will actually page you.

Then let a patch release or two land, if you can afford to wait. You usually can.

Having gone through all of it, the first thing I'm actually going to test is HPA scaling to zero. Gang scheduling after that, probably.

## Credits where they're due

15 weeks of work, May 18 to August 26, **1,754 people across 212 companies**, led by [Dipesh Rawat](https://www.linkedin.com/in/dipeshrawat/). That's the part of a release nobody reads and everybody depends on.

The Release Team runs a webinar on **September 23 at 4:00 PM UTC** through CNCF Online Programs if you want it from the people who built it.

And if you're anywhere near Gujarat, [KCD Gujarat is in Ahmedabad on September 19](https://www.kcdgujarat.com/), the state's first Kubernetes Community Day. I'll be there. Good place to argue about whether scale-to-zero will actually save anyone money.

As for the other Garhwal, the one with the 52 forts: still haven't been. Still going.

Now go watch that logo cycle through a day.

$ happy upgrading

## References

- [Kubernetes v1.37: Garhwal](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/), the official release announcement
- [CHANGELOG-1.37.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.37.md#changelog-since-v1360), including the urgent upgrade notes quoted above
- [SELinux volume labelling changes](https://kubernetes.io/blog/2026/04/22/breaking-changes-in-selinux-volume-labeling/), the pre-announcement worth reading if you run SELinux
- [Projected volumes](https://kubernetes.io/docs/concepts/storage/projected-volumes/), for the pod certificate field reference
- [Garhwal kingdom and the 52 garh](https://en.wikipedia.org/wiki/Garhwal_kingdom#52_garh_of_Garhwal), where the release name comes from
- [Garhwal division](https://en.wikipedia.org/wiki/Garhwal_division), the seven districts and the geography

*The diagrams in this post are hand-drawn and free to reuse with attribution.*

Hopefully, you enjoyed the article! See you in the next one. Until then, happy podding.
