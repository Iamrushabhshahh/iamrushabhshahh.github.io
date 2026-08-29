/* =====================================================================
   build-blog.mjs — markdown → static blog generator for rushabhshah.dev

   Reads   content/posts/*.md   (frontmatter: title, description, date,
                                 tags, draft, canonical, slug, cover,
                                 updated, featured, series)
   Writes  blog/index.html          post listing (pinned + coming soon + by year)
           blog/<slug>/index.html   individual posts
           blog/tags/<tag>/         per-tag listings
           blog/rss.xml             RSS 2.0 feed
           blog/posts.json          latest posts (for homepage widgets)
           sitemap.xml              regenerated with all live URLs

   Scheduling: a post whose `date` is in the future is skipped at build
   time. The GitHub Actions workflow rebuilds daily at 00:10 IST, so the
   post goes live automatically on the first run after its date/time
   passes (up to 24h later). Dates without an explicit timezone are
   treated as IST (+05:30).
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { marked } from 'marked';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Cache-bust the stylesheet with a hash of its own contents.
   /style.css is served with max-age=14400, so for four hours after a deploy a
   returning visitor pairs freshly-changed HTML with the stylesheet they already
   had — any markup that depends on new CSS renders broken, and no amount of
   local testing catches it because localhost has neither a CDN nor a warm
   cache. A content-derived URL makes changed CSS a different resource, so the
   two can never go out of sync; when the CSS is unchanged the URL is unchanged
   and the cached copy is still reused. */
const CSS_VERSION = crypto
  .createHash('sha256')
  .update(fs.readFileSync(path.join(ROOT, 'style.css')))
  .digest('hex')
  .slice(0, 8);
const CSS_HREF = `/style.css?v=${CSS_VERSION}`;
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const SITE = 'https://rushabhshah.dev';
const AUTHOR = 'Rushabh Shah';
// AWIN deep link for The Linux Foundation (US) — advertiser 85919, publisher
// 2950265 — generated via AWIN's Link Builder. Without this, RUSHABH30
// clicks reach training.linuxfoundation.org untracked and earn no commission.
// awinLink() wraps any destination on that domain with the same tracking
// params (verified against AWIN's own Link Builder output byte-for-byte),
// so each cert page can send its "Get X" button straight to that exam's own
// page instead of the generic catalog.
const awinLink = (dest) => `https://www.awin1.com/cread.php?awinmid=85919&awinaffid=2950265&ued=${encodeURIComponent(dest)}`;
const BLOG_TITLE = 'Rushabh Shah · Blog';
const BLOG_DESC = 'Articles on DevOps, Kubernetes, Docker, and observability, by Rushabh Shah, Docker Captain and Grafana Champion.';

/* ---------- dedicated per-certification discount pages ----------
   /linux-foundation-coupon/<slug>/ — one focused landing page per exam,
   generated from data (not hand-copied HTML) so structure can't drift
   between pages the way the coupon page's duplicated Person JSON-LD once did.

   Scope is deliberately limited to certs with real, stable search volume
   or a genuine authority angle, not all ~14 exams RUSHABH30 covers.
   Cranking out a thin page for every exam code risks reading as doorway
   pages to Google (near-identical content that only differs by keyword),
   which can hurt the whole domain's trust — not just those pages. LFCA,
   PCA and OTCA earned pages alongside the original 6 + Kubestronaut: LFCA
   is the true broad on-ramp (KCNA is Kubernetes-specific; LFCA is the
   actual entry point), and PCA/OTCA are the observability certs a Grafana
   Champion has real standing to write about. Exam domain weightings are
   intentionally described qualitatively rather than with precise
   percentages: CNCF revises curricula periodically and a stale hardcoded
   number would be a fact this script has no way to verify. */

const CERT_PAGES = [
  {
    slug: 'cka', name: 'CKA', fullName: 'Certified Kubernetes Administrator',
    dest: 'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/',
    format: 'Performance-based (live terminal, real cluster)', duration: '2 hours',
    priceList: 445, priceDiscounted: 311, prerequisite: null,
    audience: 'Ops, platform engineering, and SRE roles who run Kubernetes clusters day to day.',
    topics: [
      'Cluster architecture, installation, and configuration',
      'Workloads and scheduling',
      'Services and networking',
      'Storage',
      'Troubleshooting cluster and application issues',
    ],
    why: 'The CKA is the credential hiring managers actually check for when a role involves running Kubernetes in production, not just deploying to it. It\'s a live-terminal, performance-based exam. You fix real broken clusters against the clock, not multiple-choice questions. So it certifies you can actually do the job, not just describe it.',
    prepTips: [
      'Practice in a real terminal daily in the weeks before. This exam is a speed test as much as a knowledge test, and muscle memory for kubectl and vim matters more than reading about concepts.',
      'Get comfortable with the allowed documentation (kubernetes.io) during practice, since you\'re allowed to reference it in the real exam. Know where to find things fast rather than memorizing everything.',
      'Troubleshooting is the single biggest domain, so spend disproportionate practice time deliberately breaking and fixing clusters, not just deploying happy-path workloads.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is the CKA exam multiple-choice?', a: 'No. It\'s 100% performance-based: you\'re given a live terminal and a set of real Kubernetes clusters, and you complete hands-on tasks against the clock. There\'s no multiple-choice section.' },
      { q: 'Do I need any prerequisite certification for the CKA?', a: 'No. The CKA has no certification prerequisite, though the Linux Foundation recommends some hands-on Kubernetes experience first.' },
      { q: 'How much is the CKA with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}, a saving of roughly $134.` },
      { q: 'Does RUSHABH30 work on the CKA course + exam bundle?', a: 'Yes. The 30% applies whether you buy the exam alone or bundled with the official prep course, and the bundle is usually the better value since it\'s already discounted before the code applies.' },
      { q: 'What\'s actually included in the $445, not just the exam attempt?', a: 'One free retake if you don\'t pass the first time, two exam simulator attempts (36 hours of access each, from activation), and a 12-month window to schedule and sit the exam after purchase. Most coupon pages only mention the price and skip this.' },
      { q: 'What should I do after passing the CKA?', a: 'The natural next steps are the CKAD if you also ship applications to Kubernetes, or the CKS if you want the strongest Kubernetes security signal on your CV. CKS requires an active CKA to sit.' },
    ],
  },
  {
    slug: 'ckad', name: 'CKAD', fullName: 'Certified Kubernetes Application Developer',
    dest: 'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/',
    format: 'Performance-based (live terminal, real cluster)', duration: '2 hours',
    priceList: 445, priceDiscounted: 311, prerequisite: null,
    audience: 'Developers who build and deploy applications to Kubernetes, without administering the underlying cluster.',
    topics: [
      'Application design and build',
      'Application deployment',
      'Application observability and maintenance',
      'Application environment, configuration, and security',
      'Services and networking',
    ],
    why: 'The CKAD exists for a real gap: most developers shipping to Kubernetes don\'t need cluster-administration depth. They need to know pods, deployments, config, probes, and how to debug their own workloads fast. It\'s the same performance-based format as the CKA, just scoped to the application layer instead of the platform layer.',
    prepTips: [
      'Focus practice time on the manifest types you\'ll actually write day to day (Deployments, ConfigMaps, Secrets, and probes), since the exam rewards speed writing and editing YAML under time pressure.',
      'Practice debugging a broken Pod from logs and describe output alone; a meaningful slice of the exam is "this deployment is failing, find out why."',
      'Like the CKA, you can reference kubernetes.io during the exam. Practice navigating to the exact page you need instead of trying to memorize every flag.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is the CKAD easier than the CKA?', a: 'It\'s narrower, not necessarily easier. CKAD skips cluster-administration topics but goes deep on the application layer (config, probes, multi-container pod patterns) that the CKA only touches lightly.' },
      { q: 'Do I need the CKA before taking the CKAD?', a: 'No. CKAD has no certification prerequisite and is commonly taken by developers who never plan to sit the CKA at all.' },
      { q: 'How much is the CKAD with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is the CKAD hands-on or multiple-choice?', a: 'Hands-on. Like the CKA, it\'s a live-terminal, performance-based exam against real clusters, with no multiple-choice questions.' },
      { q: 'Does RUSHABH30 work on the CKAD course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'cks', name: 'CKS', fullName: 'Certified Kubernetes Security Specialist',
    dest: 'https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/',
    format: 'Performance-based (live terminal, real cluster)', duration: '2 hours',
    priceList: 445, priceDiscounted: 311, prerequisite: 'an active CKA certification',
    audience: 'Security engineers and platform engineers who already hold the CKA and want the strongest Kubernetes security credential available.',
    topics: [
      'Cluster setup and hardening',
      'System hardening',
      'Minimizing microservice vulnerabilities',
      'Supply chain security',
      'Monitoring, logging, and runtime security',
    ],
    why: 'CKS is the one Linux Foundation cert with a real prerequisite. You need an active CKA to even sit it. Which is exactly why it carries weight on a CV. It signals you can secure a cluster end to end: hardening, supply-chain integrity, runtime detection, not just administer one.',
    prepTips: [
      'Get your CKA active first; the Linux Foundation checks this at scheduling time, so leave a buffer if yours is close to expiring.',
      'Spend real practice time on tools the exam actually uses hands-on, such as Falco for runtime detection, network policies, and admission controllers, rather than just reading security theory.',
      'Supply-chain security (image scanning, signing, sane base images) is a newer domain relative to the older CKA/CKAD content; don\'t skip it assuming it\'s a small footnote.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need the CKA before taking the CKS?', a: 'Yes. This is the one Linux Foundation Kubernetes cert with a hard prerequisite. You must hold an active CKA to schedule the CKS.' },
      { q: 'How much is the CKS with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is the CKS worth it if I already have the CKA?', a: 'For anyone doing platform or security work, yes. It\'s one of the strongest security-specific signals you can add to a DevOps CV, and it\'s a natural next step once your CKA is active.' },
      { q: 'Is the CKS multiple-choice?', a: 'No. Like the CKA and CKAD, it\'s 100% performance-based against live clusters.' },
      { q: 'Does RUSHABH30 work on the CKS course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'kcna', name: 'KCNA', fullName: 'Kubernetes and Cloud Native Associate',
    dest: 'https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/',
    format: 'Multiple choice', duration: '90 minutes',
    priceList: 250, priceDiscounted: 175, prerequisite: null,
    audience: 'Students, career-changers, and anyone moving into cloud-native from another field who wants a beginner-friendly starting point.',
    topics: [
      'Kubernetes fundamentals',
      'Container orchestration',
      'Cloud native architecture',
      'Cloud native observability',
      'Cloud native application delivery',
    ],
    why: 'KCNA is the entry point built for people who aren\'t ready for a live-terminal exam yet. It\'s multiple choice, it\'s the cheapest cert in the catalog, and it forces you to learn the cloud-native landscape\'s vocabulary (Kubernetes, containers, observability, GitOps) before you touch a cluster in anger.',
    prepTips: [
      'Treat it as landscape literacy, not hands-on skill. You\'re learning what things are and how they fit together, not memorizing kubectl syntax.',
      'The official CNCF/Linux Foundation curriculum outline is the most efficient study map; work through it topic by topic rather than a single dense course.',
      'If you\'re also considering the CKA later, KCNA is a genuinely useful on-ramp. The vocabulary you learn here removes a lot of friction from CKA prep.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is KCNA a good first certification for beginners?', a: 'Yes. It\'s specifically designed as the entry point into Kubernetes and cloud native, with no hands-on requirement and a lower price than the performance-based exams.' },
      { q: 'How much is KCNA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'Is KCNA hands-on like the CKA?', a: 'No. KCNA is entirely multiple choice, with no live terminal or cluster access required.' },
      { q: 'Should I take KCNA before the CKA?', a: 'It\'s not required, but it\'s a sensible on-ramp if you\'re new to the ecosystem. It builds vocabulary and context that make CKA prep faster.' },
      { q: 'Does RUSHABH30 work on the KCNA course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'kcsa', name: 'KCSA', fullName: 'Kubernetes and Cloud Native Security Associate',
    dest: 'https://training.linuxfoundation.org/certification/kubernetes-and-cloud-native-security-associate-kcsa/',
    format: 'Multiple choice', duration: '90 minutes',
    priceList: 250, priceDiscounted: 175, prerequisite: null,
    audience: 'Beginners who want security awareness early in their cloud-native career, without committing to the full CKA-then-CKS path yet.',
    topics: [
      'Overview of cloud native security',
      'Kubernetes cluster component security',
      'Kubernetes security fundamentals',
      'Kubernetes threat model',
      'Platform security, compliance, and security frameworks',
    ],
    why: 'KCSA pairs naturally with KCNA: same multiple-choice format, same entry-level price, but focused on security concepts instead of general architecture. It\'s a way to show security awareness on a CV years before you\'d be ready for the CKA-gated CKS.',
    prepTips: [
      'Pair it with KCNA if you\'re studying both. The fundamentals overlap enough that studying them together is more efficient than sequentially.',
      'This is conceptual security knowledge (threat models, compliance frameworks), not hands-on hardening. Save the tool-heavy practice for CKS later.',
      'The 4Cs of cloud native security (Cloud, Cluster, Container, Code) are a recurring framing across the official curriculum and worth understanding cold.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need the CKA or CKS before KCSA?', a: 'No. KCSA has no certification prerequisite and is designed as an entry-level security credential.' },
      { q: 'How much is KCSA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'Is KCSA the same as the CKS?', a: 'No. KCSA is a beginner, multiple-choice associate exam on security concepts. CKS is an advanced, hands-on exam that requires an active CKA. They\'re different tiers entirely.' },
      { q: 'Is KCSA hands-on?', a: 'No, it\'s entirely multiple choice, like KCNA.' },
      { q: 'Does RUSHABH30 work on the KCSA course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'lfcs', name: 'LFCS', fullName: 'Linux Foundation Certified System Administrator',
    dest: 'https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/',
    format: 'Performance-based (live terminal, real system)', duration: '2 hours',
    priceList: 445, priceDiscounted: 311, prerequisite: null,
    audience: 'Anyone in an infrastructure role, not Kubernetes-specific, who wants a hands-on Linux fundamentals credential.',
    topics: [
      'Essential commands',
      'Operation of running systems',
      'User and group management',
      'Networking',
      'Service configuration',
      'Storage management',
      'Essential security',
    ],
    why: 'LFCS is honestly underrated in a Kubernetes-heavy job market: a lot of "Kubernetes debugging" sessions are actually Linux debugging sessions wearing a trench coat: DNS, file permissions, systemd units, disk pressure. LFCS certifies the fundamentals that every other Linux Foundation cert quietly assumes you already have.',
    prepTips: [
      'If your Kubernetes troubleshooting keeps bottoming out in "wait, is this actually a Linux problem," take LFCS first. It fills exactly that gap.',
      'It\'s performance-based like the CKA, so practice in a real shell daily rather than just reading man pages.',
      'Storage and networking fundamentals here transfer directly into Kubernetes storage classes and CNI troubleshooting later, so it\'s not wasted effort even if Kubernetes is your end goal.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is LFCS a Kubernetes certification?', a: 'No. LFCS is a general Linux system administration credential. It\'s a strong complement to the Kubernetes certs (CKA/CKAD/CKS) rather than a replacement for them.' },
      { q: 'How much is LFCS with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is LFCS hands-on or multiple-choice?', a: 'Hands-on. It\'s a performance-based exam on a real Linux system, not multiple choice.' },
      { q: 'Should I take LFCS before or after the CKA?', a: 'Before, if you\'re shaky on core Linux. The LFCS fundamentals (networking, storage, permissions) make CKA troubleshooting scenarios much less frustrating.' },
      { q: 'Does RUSHABH30 work on the LFCS course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'kubestronaut', name: 'Kubestronaut', fullName: 'Kubestronaut bundle (KCNA + KCSA + CKA + CKAD + CKS)',
    dest: 'https://training.linuxfoundation.org/certification/kubestronaut-bundle/',
    format: 'Bundle of 5 exams (2 multiple-choice, 3 performance-based)', duration: 'Varies per exam',
    priceList: 1645, priceDiscounted: 1151, prerequisite: 'CKS specifically requires an active CKA',
    isBundle: true,
    audience: 'Engineers pursuing official Kubestronaut recognition from CNCF, or anyone who\'s decided to complete the full Kubernetes certification track.',
    topics: [
      'KCNA: Kubernetes and Cloud Native Associate',
      'KCSA: Kubernetes and Cloud Native Security Associate',
      'CKA: Certified Kubernetes Administrator',
      'CKAD: Certified Kubernetes Application Developer',
      'CKS: Certified Kubernetes Security Specialist',
    ],
    why: 'Kubestronaut is CNCF\'s recognition for engineers who hold all five Kubernetes certifications (KCNA, KCSA, CKA, CKAD, and CKS) at the same time. Buying the bundle is the practical way to work toward it: on a five-exam purchase, RUSHABH30 produces a much bigger dollar saving than any single exam, and this page runs the actual math instead of just quoting a percentage. (If you\'re going for every CNCF certification, not just these five, see the Golden Kubestronaut bundle, where the saving is even larger.)',
    prepTips: [
      'Sequence matters: CKS needs an active CKA, so plan CKA before CKS even if you buy all five exams in one bundle purchase.',
      'KCNA and KCSA (both multiple choice) are the fastest wins. Knock those out first for early momentum before the three performance-based exams.',
      'Because each cert has its own validity window, think about scheduling cadence up front so you\'re not racing to renew an early cert before you\'ve sat the later ones.',
    ],
    retakeNote: 'the full five-exam bundle; retakes on individual exams follow that exam\'s own eligibility window',
    faqs: [
      { q: 'What is Kubestronaut?', a: 'Kubestronaut is CNCF\'s official recognition for engineers who hold all five Kubernetes certifications (KCNA, KCSA, CKA, CKAD, and CKS) simultaneously.' },
      { q: 'How much does the Kubestronaut bundle cost with a discount code?', a: `List price is $${1645} for all five exams. With RUSHABH30 it drops to about $${1151}, a saving of roughly $494.` },
      { q: 'Do I have to pass all five exams at once?', a: 'No. Buying the bundle just locks in the discounted price for all five; you can schedule and sit each exam on your own timeline within your eligibility window.' },
      { q: 'Which exam should I take first in the bundle?', a: 'KCNA is the common starting point since it\'s multiple choice and builds vocabulary the other four assume you already know. Save CKS for last since it requires an active CKA.' },
      { q: 'Is there an even bigger bundle than Kubestronaut?', a: 'Yes. The Golden Kubestronaut bundle adds every other current CNCF certification on top of the five Kubestronaut certs, for engineers going for the full catalog.' },
    ],
  },
  {
    slug: 'golden-kubestronaut', name: 'Golden Kubestronaut', fullName: 'Golden Kubestronaut bundle (16 CNCF certs)',
    dest: 'https://training.linuxfoundation.org/certification/golden-kubestronaut-bundle/',
    format: 'Bundle of 16 exams (multiple-choice and performance-based)', duration: 'Varies per exam',
    priceList: 4229, priceDiscounted: 2960,
    prerequisite: 'CKS requires an active CKA; Golden Kubestronaut itself requires holding all 16 certifications at once',
    isBundle: true,
    audience: 'Experienced cloud native professionals going for the single most complete credential the Linux Foundation and CNCF offer: every certification in the Kubestronaut track plus every other current associate-level CNCF exam.',
    topics: [
      'CKA: Certified Kubernetes Administrator',
      'CKAD: Certified Kubernetes Application Developer',
      'CKS: Certified Kubernetes Security Specialist',
      'LFCS: Linux Foundation Certified System Administrator',
      'CNPE: Certified Cloud Native Platform Engineer',
      'KCNA: Kubernetes and Cloud Native Associate',
      'KCSA: Kubernetes and Cloud Native Security Associate',
      'PCA: Prometheus Certified Associate',
      'ICA: Istio Certified Associate',
      'CCA: Cilium Certified Associate',
      'CAPA: Certified Argo Project Associate',
      'CGOA: Certified GitOps Associate',
      'CBA: Certified Backstage Associate',
      'OTCA: OpenTelemetry Certified Associate',
      'KCA: Kyverno Certified Associate',
      'CNPA: Certified Cloud Native Platform Engineering Associate',
    ],
    why: 'Golden Kubestronaut is CNCF\'s recognition for holding every one of its certifications at once: sixteen exams, not five. CNCF launched the program in April 2025, and over 100 engineers had already earned the title within five months, so this is an actively growing recognition, not a legacy badge nobody pursues. On a purchase this size, RUSHABH30 produces the single biggest dollar saving it generates on this entire site. More than double the five-exam Kubestronaut bundle, simply because there are more than three times as many exams for the same 30% to apply to.',
    prepTips: [
      'Sequence the sixteen exams deliberately: CKS still needs an active CKA even inside this bigger bundle, so don\'t buy the exams in a random order.',
      'Clear the eleven multiple-choice associate exams (KCNA, KCSA, PCA, ICA, CCA, CAPA, CGOA, CBA, OTCA, KCA, CNPA) first to build momentum before the four performance-based, live-terminal exams (CKA, CKAD, CKS, LFCS).',
      'Linux Foundation\'s own program page notes new CNCF certifications can be added to the requirement list as they launch. Budget for the list to grow past sixteen, not assume it\'s fixed forever.',
    ],
    retakeNote: 'the full sixteen-exam bundle; retakes on individual exams follow that exam\'s own eligibility window',
    faqs: [
      { q: 'What is Golden Kubestronaut?', a: 'CNCF\'s recognition for holding all 16 current CNCF and Linux Foundation Kubernetes-ecosystem certifications simultaneously: the full catalog, not just the five-exam Kubestronaut track.' },
      { q: 'How much does the Golden Kubestronaut bundle cost with a discount code?', a: `List price is $${4229} for all sixteen exams. With RUSHABH30 it drops to about $${2960}, a saving of roughly $1,269, the largest single saving RUSHABH30 produces on any purchase on this site.` },
      { q: 'Do I need the regular Kubestronaut certification before Golden Kubestronaut?', a: 'There\'s no separate application step. Golden Kubestronaut is earned simply by holding all 16 certifications, which happen to include the same five that make up standard Kubestronaut (KCNA, KCSA, CKA, CKAD, CKS) plus eleven more.' },
      { q: 'Is Golden Kubestronaut a real, active program?', a: 'Yes. CNCF launched it in April 2025, and Linux Foundation reported over 100 engineers had achieved it within the first five months. It\'s actively promoted, not a dormant legacy title.' },
      { q: 'Can the certification list change?', a: 'Yes. Linux Foundation\'s own program page states that as new CNCF certifications launch, they may be added to the Golden Kubestronaut requirements to keep the badge current.' },
    ],
  },
  {
    slug: 'lfca', name: 'LFCA', fullName: 'Linux Foundation Certified IT Associate',
    dest: 'https://training.linuxfoundation.org/certification/certified-it-associate/',
    format: 'Multiple choice', duration: '90 minutes',
    priceList: 250, priceDiscounted: 175, prerequisite: null,
    audience: 'Career-changers and anyone new to IT who wants a broad, vendor-neutral credential covering Linux, sysadmin, cloud, security, and DevOps fundamentals before specializing.',
    topics: [
      'Linux Fundamentals',
      'System Administration Fundamentals',
      'Cloud Computing Fundamentals',
      'Security Fundamentals',
      'DevOps Fundamentals',
      'IT Project Management Fundamentals',
    ],
    why: 'LFCA is the Linux Foundation\'s broadest entry-level credential. It doesn\'t specialize in Kubernetes or Linux administration specifically, it certifies the full spread of fundamentals (Linux, networking, cloud, security, DevOps basics, even project management) that every other Linux Foundation cert quietly assumes you already have. The exam itself was refreshed in September 2025, so it\'s testing current material, not a stale curriculum.',
    prepTips: [
      'Treat System Administration Fundamentals as the highest-value domain to study. It\'s the single biggest slice of the exam, ahead of even Cloud Computing.',
      'This is multiple choice, not hands-on, so focus on recognizing concepts and terminology across a wide surface area rather than deep muscle-memory practice in a terminal.',
      'If you\'re also eyeing LFCS or a Kubernetes cert later, LFCA is worth doing first. The vocabulary overlap makes everything after it faster to learn.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is the LFCA exam hands-on or multiple-choice?', a: 'Multiple choice: 90 minutes, no live terminal or cluster access required, unlike the performance-based LFCS or CKA.' },
      { q: 'Do I need any prerequisite certification for the LFCA?', a: 'No. LFCA has no certification prerequisite and is explicitly designed as a pre-professional, entry-level credential.' },
      { q: 'How much is the LFCA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}, a saving of roughly $75.` },
      { q: 'Does RUSHABH30 work on the LFCA course + exam bundle?', a: 'Yes. The 30% applies whether you buy the exam alone or bundled with the official prep course.' },
      { q: 'What should I do after passing the LFCA?', a: 'LFCA is a broad on-ramp. The natural next steps are LFCS if you want to go deep on Linux system administration, or KCNA if Kubernetes and cloud native is the direction you\'re headed.' },
    ],
  },
  {
    slug: 'pca', name: 'PCA', fullName: 'Prometheus Certified Associate',
    dest: 'https://training.linuxfoundation.org/certification/prometheus-certified-associate/',
    format: 'Multiple choice', duration: '90 minutes',
    priceList: 250, priceDiscounted: 175, prerequisite: null,
    audience: 'Engineers and application developers with a specific interest in monitoring. Ideal candidates already hold a Kubernetes cert like KCNA, CKA, or CKAD, or have completed a cloud engineer bootcamp.',
    topics: [
      'Observability Concepts',
      'Prometheus Fundamentals',
      'PromQL',
      'Instrumentation and Exporters',
      'Alerting & Dashboarding',
    ],
    why: 'PCA is CNCF official content, and it exists because "I can install Grafana" and "I actually understand Prometheus\'s data model and PromQL" are very different claims. The exam leans hard on PromQL. It\'s the largest single domain on the exam, bigger than Prometheus Fundamentals itself. So it certifies you can actually query and reason about metrics, not just point a dashboard at a data source.',
    prepTips: [
      'PromQL is worth a disproportionate amount of your study time. It\'s the single biggest domain on the exam, bigger than Prometheus Fundamentals itself.',
      'Practice writing queries from scratch rather than just reading example dashboards. The exam tests your ability to construct PromQL, not just recognize it.',
      'If you already hold KCNA, CKA, or CKAD, you\'re the exact candidate profile Linux Foundation built this exam for, and the Kubernetes context will make the instrumentation and exporters domain much more intuitive.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need Prometheus experience before taking the PCA?', a: 'There\'s no formal prerequisite, but Linux Foundation designed it for engineers who already have some Kubernetes exposure (KCNA, CKA, or CKAD) or a cloud engineering background.' },
      { q: 'Is the PCA exam hands-on or multiple-choice?', a: 'Multiple choice: 90 minutes, no live cluster or terminal required.' },
      { q: 'How much is the PCA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'Is the PCA a CNCF-recognized certification?', a: 'Yes. It carries the CNCF official content badge, alongside KCNA, CKA, CKAD, CKS, and the other Cloud Native Computing Foundation-aligned exams.' },
      { q: 'What should I take after the PCA?', a: 'If observability is your focus, OTCA (OpenTelemetry Certified Associate) is the natural companion: Prometheus handles metrics, OpenTelemetry adds traces and logs to the picture.' },
    ],
  },
  {
    slug: 'otca', name: 'OTCA', fullName: 'OpenTelemetry Certified Associate',
    dest: 'https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/',
    format: 'Multiple choice', duration: '90 minutes',
    priceList: 250, priceDiscounted: 175, prerequisite: null,
    audience: 'Engineers working in DevOps or platform roles who want to prove observability expertise using OpenTelemetry, the vendor-neutral standard for traces, metrics, and logs.',
    topics: [
      'Fundamentals of Observability',
      'The OpenTelemetry API and SDK',
      'The OpenTelemetry Collector',
      'Maintaining and Debugging Observability Pipelines',
    ],
    why: 'OpenTelemetry has become the default way applications emit traces, metrics, and logs without locking into one vendor\'s SDK, and OTCA is CNCF official content proving you actually know the API and SDK, not just that you\'ve wired up an agent once. The OpenTelemetry API and SDK domain alone makes up close to half the exam, so it certifies real instrumentation knowledge, not just Collector configuration.',
    prepTips: [
      'The API and SDK domain is worth studying hardest. It\'s close to half the exam on its own, well ahead of the Collector domain.',
      'Get hands-on with Collector configuration stanzas specifically. Real exam-takers report the questions use practical, real-world config examples rather than abstract theory.',
      'This pairs naturally with Prometheus knowledge: OpenTelemetry handles the instrumentation and pipeline side, Prometheus is a common metrics backend it feeds into.',
    ],
    retakeNote: 'the exam alone, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need any prerequisite for the OTCA?', a: 'No. OTCA has no certification prerequisite.' },
      { q: 'Is the OTCA exam hands-on or multiple-choice?', a: 'Multiple choice: 90 minutes, online and proctored, no live terminal required.' },
      { q: 'How much is the OTCA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'How many attempts do I get on the OTCA?', a: 'Your purchase includes one retake (two attempts total) within a 12-month exam eligibility window.' },
      { q: 'What should I take after the OTCA?', a: 'Linux Foundation points candidates toward CKA to round out Kubernetes fundamentals, or toward Kubestronaut status if you\'re already deep into the certification track.' },
    ],
  },
];

/* ---------- FinOps Foundation partner code ----------
   /finops-coupon/ and /finops-coupon/<slug>/ — a second, separate affiliate
   programme from the Linux Foundation one above, and the two must not be
   blurred together on the page. They're separated by checkout, not by topic:
   RUSHABH30 applies at training.linuxfoundation.org and RUSHABH_20 at
   learn.finops.org, and neither is accepted by the other. Say it that way
   rather than "RUSHABH30 doesn't work on FinOps" — the LF catalog does carry
   some FinOps-branded material, so the topic-based phrasing is wrong and
   contradicts the linux-foundation-coupon repo's own sale notes.

   Scope is set by the partner agreement, not by what's in the catalog: the
   FinOps Foundation approved five specific offerings for promotion, so only
   those five get pages. Notably NOT eligible, and therefore never quoted with
   a discount anywhere on this site: FinOps Certified Professional, the
   multi-cert bundles, FinOps for Containers, the exam-only and recertification
   SKUs, and the corporate training subscriptions.

   List prices below were read off learn.finops.org's own catalog. Unlike the
   Linux Foundation pages there is no tracking-link equivalent here (no AWIN
   deep link exists for this programme), so attribution runs entirely through
   the code itself — which is also why every CTA sends people to the exact
   product page rather than a generic catalog URL. */

const FINOPS_CODE = 'RUSHABH_20';
const FINOPS_PCT = 20;
const finopsPrice = (list) => Math.round(list * (100 - FINOPS_PCT) / 100);

const FINOPS_PAGES = [
  {
    slug: 'practitioner', name: 'FOCP', shortFor: 'Everyone: the default first FinOps certification', fullName: 'FinOps Certified Practitioner',
    dest: 'https://learn.finops.org/path/finops-certified-practitioner-self-paced',
    offering: 'Self-Paced Course + Certification Exam',
    format: 'Multiple choice, online, self-directed', duration: 'About 6 to 8 hours of course content',
    priceList: 500, validity: '24 months', prerequisite: null,
    audience: 'Anyone who touches a cloud bill: finance, engineering, procurement, and product people who need one shared language for cost, usage, and value. It is the default first FinOps certification.',
    topics: [
      'What FinOps is, and the FinOps Framework',
      'FinOps teams, culture, personas, and motivations',
      'FinOps domains and capabilities',
      'Anatomy of the cloud bill, and the data in the path',
      'The Inform, Optimize, and Operate phases',
      'Adopting and maturing a FinOps practice',
    ],
    why: 'FOCP is the one FinOps credential most job descriptions actually name. The real value is not the badge, it is the vocabulary: once your finance team and your platform team both say "allocation", "unit economics" and "showback" to mean the same thing, cost conversations stop being arguments about whose number is right. Everything else in the FinOps catalog assumes you already have this.',
    prepTips: [
      'Bring a real bill. Open your own AWS, Azure, or GCP cost console next to the course and map each concept onto spend you actually recognise, because the exam rewards understanding the shape of a bill rather than memorising definitions.',
      'The Inform, Optimize, Operate loop is the spine of the whole framework and the thing most questions hang off, so get comfortable placing any given activity into the right phase.',
      'Do not skip the personas material even though it feels soft next to the billing content. A meaningful slice of the exam is about who cares about which metric and why.',
    ],
    faqs: [
      { q: 'Is the FinOps Certified Practitioner exam hands-on?', a: 'No. It is a multiple-choice exam you complete online at your own pace, with no live console or terminal work. Enrolment includes the exam alongside the course.' },
      { q: 'How much is the FinOps Certified Practitioner with a discount code?', a: 'The self-paced course plus certification exam lists at $500. With RUSHABH_20 it comes to about $400, saving roughly $100.' },
      { q: 'Do I need a prerequisite for FOCP?', a: 'No formal prerequisite. The FinOps Foundation recommends a general understanding of infrastructure, usage-based pricing, and familiarity with at least one major cloud provider.' },
      { q: 'How long does the FinOps Practitioner certification last?', a: 'The certification is valid for 24 months, and your enrolment includes 12 months of access to the course materials.' },
      { q: 'Does RUSHABH_20 work on the exam-only option?', a: 'No. The code covers the Self-Paced Course + Certification Exam offering. The cheaper exam-only SKU is not one of the five offerings the FinOps Foundation approved for this code.' },
      { q: 'Is FOCP worth it if I already do cloud cost work?', a: 'If you already cut spend for a living, the framework will not teach you new levers. What it gives you is the shared structure and language to defend those decisions to finance and leadership, which is usually the harder half of the job.' },
    ],
  },
  {
    slug: 'engineer', name: 'FOCE', shortFor: 'Engineers who build and run the infrastructure', fullName: 'FinOps Certified Engineer',
    dest: 'https://learn.finops.org/path/finops-certified-engineer',
    offering: 'Self-Paced Course + Certification Exam',
    format: 'Multiple choice, online, self-directed', duration: 'About 10 hours of course content; exam about 1 hour',
    priceList: 500, validity: '24 months', prerequisite: null,
    audience: 'Engineers who design, build, and run cloud infrastructure, and who keep being told their systems are a cost line rather than a value driver.',
    topics: [
      'How FinOps applies inside the development lifecycle',
      'Working with FinOps practitioners rather than around them',
      'Using cost and usage data to drive engineering decisions',
      'Architecting and operating for cost efficiency',
      'Moving the conversation from cloud cost to cloud value',
    ],
    why: 'This is the FinOps certification aimed squarely at the people who actually change the bill. Practitioners can report a number and file a ticket, but the instance type, the retention policy, and the autoscaling floor are engineering decisions. FOCE is about making cost a normal input to those decisions instead of a quarterly surprise, which is the single highest-leverage shift I have seen in cost work.',
    prepTips: [
      'Pick one workload you own and cost it end to end before you start, then re-cost it after each module. Concrete numbers make the material stick in a way the slides alone will not.',
      'The course keeps returning to how engineers and practitioners hand data to each other, so pay attention to the collaboration content rather than skimming to the optimization levers.',
      'If you have already done real rightsizing or commitment work, the value is in the framing and the vocabulary, so read for how to present a decision upward rather than for new techniques.',
    ],
    faqs: [
      { q: 'What is the difference between FinOps Certified Engineer and Practitioner?', a: 'Practitioner is the broad, cross-functional foundation for anyone working with cloud spend. Engineer is scoped to people who build and operate the infrastructure, focusing on how to fold cost data into design, deployment, and operations decisions.' },
      { q: 'How much is the FinOps Certified Engineer with a discount code?', a: 'The self-paced course plus certification exam lists at $500. With RUSHABH_20 it comes to about $400.' },
      { q: 'Do I need FOCP before FOCE?', a: 'No. There is no formal prerequisite and the two can be taken in either order, though Practitioner first is the more common path because it establishes the framework vocabulary.' },
      { q: 'Is the FinOps Certified Engineer exam hands-on?', a: 'No. It is multiple choice and self-directed online, roughly an hour, with no live cloud environment.' },
      { q: 'Does RUSHABH_20 work on the Engineer plus FOCUS Analyst bundle?', a: 'No. The code applies to the five individual offerings approved for it, not the multi-certification bundles. Compare the bundle price against two discounted individual enrolments before deciding.' },
    ],
  },
  {
    slug: 'focus-analyst', name: 'FOCUS Analyst', shortFor: 'Data and platform engineers working with billing data', fullName: 'FinOps Certified FOCUS Analyst',
    dest: 'https://learn.finops.org/finops-certified-focus-analyst-certification',
    offering: 'Self-Paced Course + Certification Exam',
    format: 'Multiple choice, online, self-directed', duration: 'Self-paced, with 12 months of access',
    priceList: 400, validity: '24 months', prerequisite: null,
    audience: 'Anyone who generates, ingests, or analyses billing and usage data: data engineers, analysts, platform engineers building cost pipelines, and vendors producing FOCUS-conformant exports.',
    topics: [
      'What the FOCUS specification is and the problem it solves',
      'Column definitions, attributes, and metadata',
      'Reading, validating, and interpreting FOCUS datasets',
      'Working with billing data consistently across providers',
      'Best practice for FOCUS-aligned analysis',
    ],
    why: 'FOCUS is the most quietly useful thing to come out of the FinOps Foundation. Every provider invented its own billing schema, so multi-cloud cost analysis has always started with weeks of bespoke normalisation before anyone can answer a simple question. FOCUS is the vendor-neutral format that deletes that step. This is also the cheapest of the five offerings and the most directly technical, which makes it the easiest one to justify if you build the pipelines rather than read the dashboards.',
    prepTips: [
      'Pull a real FOCUS export from a provider you use and keep it open while you work through the column definitions, because the specification makes far more sense against actual rows than in the abstract.',
      'Pay close attention to where costs can be double counted or misattributed when you join datasets, since that is exactly the failure mode the specification exists to prevent.',
      'The free Introduction to FOCUS course on the same platform is a good half-hour orientation before you start the paid one, and it costs nothing.',
    ],
    faqs: [
      { q: 'What is FOCUS?', a: 'FOCUS is the FinOps Open Cost and Usage Specification, an open, vendor-neutral schema for cloud billing and usage data. It lets cost data from different providers be read with one set of column definitions instead of a bespoke parser per vendor.' },
      { q: 'How much is the FinOps Certified FOCUS Analyst with a discount code?', a: 'It lists at $400, the cheapest of the five offerings this code covers. With RUSHABH_20 it comes to about $320.' },
      { q: 'Do I need to know SQL for the FOCUS Analyst certification?', a: 'Not formally. The FinOps Foundation suggests familiarity with basic data analysis and some awareness of how providers produce billing data. Experience querying datasets helps but is not required.' },
      { q: 'Should I take FOCP or FOCUS Analyst first?', a: 'If you work on cost data pipelines, FOCUS Analyst stands on its own and you can start there. If you need the wider practice context first, take Practitioner and add FOCUS Analyst after.' },
      { q: 'Is there a free way to learn FOCUS?', a: 'Yes. The FinOps Foundation publishes a free Introduction to FOCUS course. It will not certify you, but it is a genuine introduction and worth doing before you pay for the full certification.' },
    ],
  },
  {
    slug: 'ai-value', name: 'AI Value', shortFor: 'Teams whose AI spend has become material', fullName: 'FinOps Certified: AI Value',
    dest: 'https://learn.finops.org/path/certified-finops-for-ai',
    offering: 'Self-Paced Course + Certification Exam',
    format: 'Multiple choice, online, self-directed', duration: 'Self-paced across three levels, with 12 months of access',
    priceList: 500, validity: '24 months', prerequisite: 'None formally, though FOCP or FOCE first is strongly recommended',
    audience: 'Practitioners and engineers whose organisations have started spending real money on AI and cannot yet explain what that spend is buying.',
    topics: [
      'How AI cost behaves differently from traditional cloud services',
      'AI cost allocation, data ingestion, and anomaly detection',
      'Workload and rate optimization for AI systems',
      'Unit economics, sustainability, and cost-efficient system design',
      'Estimating AI workloads, forecasting, budgeting, and governance',
    ],
    why: 'AI spend broke most of the assumptions FinOps practices were built on. Token-based pricing has no instance to rightsize, GPU capacity is committed to rather than autoscaled, and a single team can move the monthly bill by an order of magnitude in a week. This is the newest of the five certifications and the one where existing cloud cost instincts transfer least well, which is exactly why it is worth doing deliberately rather than improvising.',
    prepTips: [
      'Go in with your own AI bill in front of you, split into inference, training, and the storage and egress around them, because the allocation material only lands once you can see how blurred those lines are in practice.',
      'The three levels build on each other, moving from visibility to optimization to forecasting and governance, so resist skipping ahead to the optimization content.',
      'Treat the forecasting section as the important one. AI budgets fail on estimation far more often than on inefficiency.',
    ],
    faqs: [
      { q: 'Do I need FinOps experience before FinOps Certified: AI Value?', a: 'There is no hard prerequisite, but the FinOps Foundation strongly recommends completing either FinOps Certified Practitioner or FinOps Certified Engineer first, because the course assumes you already know the framework.' },
      { q: 'How much is FinOps Certified: AI Value with a discount code?', a: 'The self-paced course plus certification exam lists at $500. With RUSHABH_20 it comes to about $400.' },
      { q: 'How is FinOps for AI different from regular cloud FinOps?', a: 'The levers change. There is no instance to rightsize on token-priced inference, GPU capacity is committed to rather than scaled on demand, and cost per unit of business value is much harder to attribute. The framework still applies; the specific optimization and allocation techniques do not transfer directly.' },
      { q: 'Is this certification worth it if we only use hosted APIs?', a: 'Yes, arguably more so. API-billed AI spend is the easiest kind to lose track of, because it needs no provisioning and shows up as one line on a bill that nobody owns.' },
      { q: 'Does RUSHABH_20 work on the AI Value plus Technology Value bundle?', a: 'No. The code applies to the individual approved offerings, not the bundles. Buy them separately with the code, or price the bundle and compare.' },
    ],
  },
  {
    slug: 'technology-value', name: 'Technology Value', shortFor: 'Practices growing past public cloud into SaaS and data centres', fullName: 'FinOps Certified: Technology Value',
    dest: 'https://learn.finops.org/path/technology-value',
    offering: 'Self-Paced Course + Certification Exam',
    format: 'Multiple choice, online, self-directed', duration: 'Six modules, self-paced, with 12 months of access',
    priceList: 500, validity: '24 months', prerequisite: 'None formally, though FOCP or FOCE first is strongly recommended',
    audience: 'Established practitioners whose remit has grown past public cloud into data centres, SaaS, and data platforms, and who need the framework to stretch that far.',
    topics: [
      'Defining and managing FinOps Scopes',
      'Applying the FinOps Framework beyond public cloud',
      'Public cloud, data centre, SaaS, and data cloud platforms as distinct categories',
      'How capabilities, personas, and optimization levers differ per category',
      'Connecting technology spend to business strategy and outcomes',
      'Driving executive alignment on technology investment',
    ],
    why: 'Most FinOps practices hit the same wall: the cloud bill gets well managed, and then someone points out that SaaS licences, the remaining data centre, and the data platform together cost more than the cloud does. This is the certification for widening the practice without abandoning the framework, and Scopes are the piece that makes that tractable rather than infinite.',
    prepTips: [
      'List every technology cost category your organisation actually carries before you start, including the ones nobody currently owns, and use that list as the worked example throughout.',
      'Scopes are the load-bearing concept in this course. Getting precise about what your practice does and does not cover is most of the value on offer.',
      'Each category has genuinely different cost structures and data models, so resist mapping cloud habits onto SaaS or data centre spend.',
    ],
    faqs: [
      { q: 'What are FinOps Scopes?', a: 'Scopes are how a FinOps practice declares what it covers. They set the boundary and the shared expectations around which technology categories, such as public cloud, SaaS, or data centre, the practice actually operates in.' },
      { q: 'How much is FinOps Certified: Technology Value with a discount code?', a: 'The self-paced course plus certification exam lists at $500. With RUSHABH_20 it comes to about $400.' },
      { q: 'Do I need to be a FinOps Practitioner first?', a: 'Not formally, but the FinOps Foundation recommends completing FinOps Certified Practitioner or FinOps Certified Engineer beforehand, since the course builds directly on framework knowledge.' },
      { q: 'Is this useful if we are cloud only?', a: 'Less so today, more so later. If you have no data centre and minimal SaaS, start elsewhere. The moment someone asks you to account for SaaS licences or a data platform, this is the certification that has already thought about it.' },
      { q: 'How does this compare to FinOps Certified: AI Value?', a: 'They are siblings, both extending an existing practice into new territory. AI Value goes deep on one fast-moving category; Technology Value goes wide across the whole portfolio. Pick by whichever question your leadership is actually asking.' },
    ],
  },
];

/* ---------- helpers ---------- */

const escapeHtml = (s = '') => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const escapeXml = escapeHtml;

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/['".]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Injects id="..." into every H2/H3 in rendered post HTML and returns a flat
// table of contents alongside it. marked v15 dropped the old headerIds option,
// so this is a hand-rolled replacement for it.
function addHeadingIds(html) {
  const toc = [];
  const seen = new Set();
  const out = html.replace(/<h([23])>(.*?)<\/h\1>/gs, (_match, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const base = slugify(text) || 'section';
    let id = base, n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);
    toc.push({ id, text, level: Number(level) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}

// Parse frontmatter date. Strings without a timezone are assumed IST (+05:30).
function parseDate(value) {
  if (value instanceof Date) return value; // YAML unquoted timestamps arrive as UTC Dates
  if (!value) return null;
  let s = String(value).trim().replace(' ', 'T');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    if (!/T/.test(s)) s += 'T00:00';
    s += '+05:30';
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const fmtDate = (d) => d.toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata',
});

const isoDate = (d) => d.toISOString();

const readingTime = (text) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

/* Last git commit date (YYYY-MM-DD) for a repo-relative path, ignoring this
   script's own bot commits — otherwise each bot commit that touches a stamped
   file (month rollover, dateModified) becomes the "latest" commit on the next
   run, which would push the date forward by a day forever instead of settling
   once. Falls back to null outside a git checkout. */
const gitLastMod = (relPath) => {
  try {
    const out = execFileSync('git', [
      'log', '-1', '--format=%cI',
      '--grep=chore(blog): publish generated pages', '--invert-grep',
      '--', relPath,
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
};

/* ---------- HTML → Markdown, for llms.txt-spec page mirrors ----------
   https://llmstxt.org proposes serving a clean markdown version of each page
   at the same URL with .md appended. Purpose-built for this site's own
   hand-authored markup (tailwind-style utility divs/spans, feather-icon <i>
   tags, FAQ <details>, pricing <table>s) rather than a general-purpose
   converter, so it stays a dependency-free ~40 lines instead of a full DOM. */

/* The markdown mirrors are what agents read, so every entity the site's HTML
   uses has to survive the trip as a real character. Named entities beyond the
   XML five were previously passed through untouched, which is why 22 mirrors
   shipped with a literal "&middot;" where a "·" belonged. &amp; is decoded
   LAST: decoding it first turns an authored "&amp;rarr;" into "&rarr;", which
   the arrow rule would then wrongly decode a second time into "→". */
const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&middot;/g, '\u00b7').replace(/&rarr;/g, '\u2192')
  .replace(/&copy;/g, '\u00a9').replace(/&hellip;/g, '\u2026')
  .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&');

// Collapses ALL whitespace (including literal newlines from multi-line HTML
// source — a <p> in HTML doesn't preserve source line breaks, so neither
// should this) and drops the stray space that tag→space collapsing leaves
// before punctuation (e.g. "Rushabh Shah </span>." → "Rushabh Shah .").
const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ').replace(/ +([.,;:!?])/g, '$1').trim();

// A leading "#" in stripped text is sometimes literal authored content on
// this site (a terminal-comment design flourish, e.g. a stat label reading
// "# Docker Captains worldwide") rather than a real heading. Escape it so it
// isn't misread as one once it lands in a paragraph/blockquote/list item.
const escapeLeadingHash = (t) => t.replace(/^(#+)/, '\\$1');

const tableToMarkdown = (inner) => {
  const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(r => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => stripTags(c[1]).replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const [header, ...body] = rows;
  return `\n${[`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...body.map(r => `| ${r.join(' | ')} |`)].join('\n')}\n`;
};

function htmlFragmentToMarkdown(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '') // contact-form fields (incl. honeypot) aren't content
    .replace(/<img[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

  // <pre> (the terminal-window JSON snippet) needs its internal whitespace
  // preserved verbatim as a fenced code block — stash it behind a placeholder
  // so every whitespace-collapsing pass below leaves it untouched, then
  // restore it as the very last step.
  const codeBlocks = [];
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/^\n+/, '').replace(/\s+$/, '');
    codeBlocks.push(code);
    return `\n@@CODEBLOCK${codeBlocks.length - 1}@@\n`;
  });

  // Anchors wrapping a whole "card" (nested heading/paragraph/list/table, as
  // in this site's clickable tech-card links) read better unwrapped, with
  // the URL trailing as a note, than flattened into one inline [label](url).
  // Plain inline anchors still become normal markdown links.
  s = s.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const url = href.startsWith('/') ? SITE + href : href;
    if (/<(h[1-6]|p|table|ul|ol)[\s>]/i.test(inner)) return `\n${inner}\n(${url})\n`;
    const label = stripTags(inner);
    return label ? `[${label}](${url})` : '';
  });
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (stripTags(t) ? `**${stripTags(t)}**` : ''));
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (stripTags(t) ? `*${stripTags(t)}*` : ''));
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => (stripTags(t) ? `\`${stripTags(t)}\`` : ''));
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // FAQ-style <details><summary>Q</summary><div>A</div></details>
  s = s.replace(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
    (_, q, a) => `\n**${escapeLeadingHash(stripTags(q))}**\n\n${escapeLeadingHash(stripTags(a))}\n`);

  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, body) => tableToMarkdown(body));

  s = s.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, body) =>
    `\n${[...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => `- ${escapeLeadingHash(stripTags(m[1]))}`).join('\n')}\n`);

  for (const level of [4, 3, 2, 1]) {
    s = s.replace(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'),
      (_, t) => `\n${'#'.repeat(level)} ${stripTags(t)}\n`);
  }

  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => `\n> ${escapeLeadingHash(stripTags(t))}\n`);
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${escapeLeadingHash(stripTags(t))}\n`);
  s = s.replace(/<time[^>]*>([\s\S]*?)<\/time>/gi, (_, t) => stripTags(t));

  // Anything left (bare <div>/<span> text runs never wrapped in a handled
  // tag above) still needs its multi-space/newline runs collapsed the same
  // way stripTags() does for handled tags.
  s = decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/[ \t]*\n[ \t]*/g, '\n').replace(/ {2,}/g, ' ');
  s = s.split('\n').map(l => l.replace(/^[ \t]+/, '')).join('\n'); // avoid 4-space code-block misreads
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  s = s.replace(/@@CODEBLOCK(\d+)@@/g, (_, i) => '```\n' + codeBlocks[Number(i)] + '\n```');
  return s + '\n';
}

// Region of a hand-authored page worth mirroring: from <main> through the
// LAST <footer> (the site chrome one) — skips any inner article-footer
// (e.g. the coupon page's share-links footer) that appears before it.
function extractMirrorRegion(html) {
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf('<footer');
  if (start === -1) return html;
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

/* ---------- load posts ---------- */

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`No posts directory at ${POSTS_DIR}`);
  process.exit(1);
}

const DEV = process.env.DEV === '1';
const now = new Date();

/* ---------- live Linux Foundation sale ----------
   A few times a year LF Education runs an official sale that beats RUSHABH30.
   Fill in the window from the affiliate announcement and the banner renders
   itself onto the coupon page, every per-cert page and the homepage deals
   card for exactly that window.

   The daily rebuild cron is what retires it: once `end` passes, all three
   surfaces fall back to their evergreen RUSHABH30 copy on the next build with
   no manual edit, so a stale "sale ends today" banner can't outlive the sale.
   Set SALE to null once it's over and the run has retired it.

   Sale codes don't stack with RUSHABH30, and the buyer should always take the
   bigger number — but commission is attributed by the AWIN link, not the code,
   so pointing people at the better sale code through the tracking link below
   costs nothing and is the honest recommendation. */
const SALE = {
  name: 'End-of-Season Flash Sale',
  // Awin's announcement quotes two different windows: the marketing copy says
  // "August 25-27" while the offer terms give 8/24 3:00 PM - 8/29 2:59 AM ET.
  // The terms are the window the codes actually honour, so the banner runs to
  // the terms while the copy quotes the advertised date the reader will see
  // everywhere else. Times below are that ET window converted to UTC.
  start: '2026-08-24T19:00:00Z',
  end: '2026-08-29T06:59:00Z',
  // The marketing copy says "August 25-27" but the offer terms run to
  // 8/29 2:59 AM ET, i.e. through the end of August 28. Advertising the 27th
  // told people the sale was dead a day early, mid-sale. Quote the terms date
  // and name the discrepancy rather than picking one and hoping.
  advertisedEnd: 'August 28',
  copyEnd: 'August 27',
  courses: { code: 'AUG26F35', pct: 35, what: 'courses & certifications' },
  bundles: { code: 'AUG26F40', pct: 40, what: 'bundles & instructor-led training' },
  dest: 'https://training.linuxfoundation.org/august-flash-1/',
};
const saleLive = !!SALE && now >= new Date(SALE.start) && now < new Date(SALE.end);

/* ---------- sale-alert email capture ----------
   The one offer here that an aggregator can't copy: the affiliate agreements
   give real advance notice of sales, so "I'll tell you before the next one"
   is both true and worth an address. That's the pitch, not "subscribe to my
   newsletter" — nobody wants that, and the sale archive section is where a
   reader is already thinking "should I wait for a sale?".

   Collection reuses the Pageclip account the contact form already runs on, so
   there's no ESP and no sending lock-in: addresses land in the dashboard and
   export as CSV to be mailed from wherever later. Create a SECOND form in
   Pageclip (so alerts don't mix with contact messages) and paste its key below,
   split into chunks the same way the contact form does it — the URL is only
   assembled at submit time so bots scraping the HTML never see a POSTable
   endpoint.

   Until a key is set the box renders nothing at all, everywhere, so a
   half-configured form can't ship a broken input to a live money page. */
const SIGNUP = {
  keyParts: [],           // e.g. ['ICvb34', 'nUy3cZ', ...] from the Pageclip dashboard
  // Roughly how often people should expect to hear from you. Stated on the box
  // because a list that goes silent for months gets marked as spam the day it
  // finally sends, which costs far more than the signups are worth.
  cadence: 'A few times a year, only when a sale actually beats the everyday code.',
};
const signupLive = SIGNUP.keyParts.length > 0;

const saleLink = SALE ? awinLink(SALE.dest) : null;

const all = [];
const scheduled = [];

for (const file of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  if (data.draft === true) {
    if (!DEV) { console.log(`⏸  draft     ${file}`); continue; }
    console.log(`👁  draft     ${file} (shown because DEV=1)`);
  }

  const date = parseDate(data.date);
  if (!date) { console.warn(`⚠️  skipped   ${file} — missing/invalid date`); continue; }
  if (date > now && !DEV) {
    scheduled.push({ file, date, title: data.title || file.replace(/\.md$/, '') });
    console.log(`⏰ scheduled ${file} — goes live ${date.toISOString()}`);
    continue;
  }

  const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
  const { html: bodyHtml, toc } = addHeadingIds(marked.parse(content));
  all.push({
    slug,
    title: data.title || slug,
    description: data.description || '',
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
    canonical: data.canonical || `${SITE}/blog/${slug}/`,
    cover: data.cover || null, // site-relative path, e.g. /assets/blog/foo.jpg — used as thumbnail + og:image
    featured: data.featured === true, // pinned at the top of /blog/
    series: data.series ? String(data.series) : null, // posts sharing a series name get a linked series box
    date,
    updated: parseDate(data.updated) || date,
    html: bodyHtml,
    toc, // [{id, text, level}] — h2/h3 headings, used for the on-page nav sidebar
    rawContent: content.trim(),
    minutes: readingTime(content),
  });
}

all.sort((a, b) => b.date - a.date);

/* ---------- shared page chrome ---------- */

/* Read the real pixel dimensions of a local JPEG or PNG so og:image:width and
   og:image:height are always correct. LinkedIn in particular renders the large
   card unreliably when they're missing, and they used to be omitted for exactly
   the posts that had a custom cover. Falls back to the 1200x630 convention if
   the file can't be read. */
const imageSize = (siteRelPath) => {
  try {
    const buf = fs.readFileSync(path.join(ROOT, siteRelPath.replace(/^\//, '')));
    if (buf.readUInt32BE(0) === 0x89504e47) {                 // PNG
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {                  // JPEG: walk to SOFn
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch { /* fall through */ }
  return { w: 1200, h: 630 };
};

const head = ({ title, description, url, ogType = 'website', published, updated, tags, image }) => {
  const ogImage = image ? (image.startsWith('http') ? image : `${SITE}${image}`) : `${SITE}/assets/og-image.jpg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script>(function(){try{var p=localStorage.getItem('theme');if(p!=='light'&&p!=='dark')p='system';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var h=document.documentElement;h.dataset.theme=r;h.dataset.pref=p;h.style.colorScheme=r;}catch(e){}})();</script>
    <script defer src="/assets/theme.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#010409">
    <meta name="color-scheme" content="dark light">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${AUTHOR}">
    <link rel="canonical" href="${url}">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23010409'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-size='38' font-weight='700' fill='%2358a6ff'%3ER%3C/text%3E%3C/svg%3E">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_TITLE)}" href="${SITE}/blog/rss.xml">
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="${imageSize(image || '/assets/og-image.jpg').w}">
    <meta property="og:image:height" content="${imageSize(image || '/assets/og-image.jpg').h}">
    <meta property="og:image:alt" content="${escapeHtml(image ? title : AUTHOR + ' — DevOps Engineer, Docker Captain, Grafana Champion')}">
    <meta property="og:site_name" content="${escapeHtml(AUTHOR)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iamrushabhshahh">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImage}">
    ${ogType === 'article' ? `<meta property="article:published_time" content="${isoDate(published)}">
    <meta property="article:modified_time" content="${isoDate(updated)}">
    <meta property="article:author" content="${AUTHOR}">
    ${(tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}` : ''}
    <link rel="preconnect" href="https://gc.zgo.at" crossorigin>
    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/fira-code-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${CSS_HREF}">
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>`;
};

// Shared Light/System/Dark segmented control, reused across every generated
// page's desktop nav and mobile menu. `compact` renders the icon-only
// variant (labels present but .sr-only) sized for the desktop nav; the
// default renders icons + visible labels for the mobile menu row. Click and
// keyboard wiring lives once in assets/theme.js, which finds every .seg on
// the page — no per-page script needed here.
const segControl = (compact = false) => {
  const stops = [
    { value: 'light', label: 'Light', icon: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>' },
    { value: 'system', label: 'System', icon: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>' },
    { value: 'dark', label: 'Dark', icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' },
  ];
  const button = (s) => `<button type="button" role="radio" data-value="${s.value}" aria-checked="${s.value === 'system'}" tabindex="${s.value === 'system' ? '0' : '-1'}"${compact ? ` title="${s.label}"` : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon}</svg>
                    <span class="seg-label${compact ? ' sr-only' : ''}">${s.label}</span>
                </button>`;
  return `<div class="seg${compact ? ' seg--compact' : ''}" role="radiogroup" aria-label="Theme preference">
                ${stops.map(button).join('\n                ')}
            </div>`;
};

const header = `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="hidden xl:flex items-center space-x-6 text-sm nav-links">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors">./about</a>
                <a href="/#honors" class="text-gray-400 hover:text-primary-color transition-colors">./honors</a>
                <a href="/#skills" class="text-gray-400 hover:text-primary-color transition-colors">./skills</a>
                <a href="/#experience" class="text-gray-400 hover:text-primary-color transition-colors">./experience</a>
                <a href="/#projects" class="text-gray-400 hover:text-primary-color transition-colors">./projects</a>
                <a href="/blog/" class="text-primary-color transition-colors" aria-current="true">./blog</a>
                <a href="/linux-foundation-coupon/" class="text-gray-400 hover:text-primary-color transition-colors">./deals</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
            </div>
            <div class="hidden xl:flex flex-shrink-0">
                ${segControl(true)}
            </div>
            <button id="menu-btn" class="xl:hidden" aria-controls="site-menu" aria-expanded="false" aria-label="Toggle navigation menu">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
        </nav>
        <div id="site-menu" class="hidden xl:hidden bg-terminal-header/90 font-fira">
            <a href="/#about" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./about</a>
            <a href="/#honors" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./honors</a>
            <a href="/#skills" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./skills</a>
            <a href="/#experience" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./experience</a>
            <a href="/#projects" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./projects</a>
            <a href="/blog/" class="block py-2 px-4 text-sm text-primary-color">./blog</a>
            <a href="/linux-foundation-coupon/" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./deals</a>
            <a href="/#contact" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./contact</a>
            ${segControl(false)}
        </div>
        <a href="/linux-foundation-coupon/" class="block bg-primary-color/10 border-b border-border-color text-center font-fira text-xs py-2 px-4 text-gray-300 hover:text-primary-color transition-colors">
            🎓 30% off all Linux Foundation certifications (CKA, CKAD, CKS…) with code <span class="text-primary-color font-bold">RUSHABH30</span> →
        </a>
    </header>`;

const footer = `
    <footer class="border-t border-border-color mt-10">
        <div class="container mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-fira text-gray-500">
            <p>&copy; ${now.getFullYear()} ${AUTHOR} · Designed &amp; built with care.</p>
            <div class="flex flex-wrap gap-4">
                <a href="https://github.com/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">GitHub</a>
                <a href="https://in.linkedin.com/in/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">LinkedIn</a>
                <a href="https://twitter.com/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">Twitter</a>
                <a href="/blog/rss.xml" class="hover:text-primary-color">RSS</a>
                <a href="/privacy/" class="hover:text-primary-color">Privacy</a>
                <a href="/linux-foundation-coupon/" class="hover:text-primary-color">30% off Linux Foundation ↗</a>
            </div>
        </div>
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const b = document.getElementById('menu-btn');
            const m = document.getElementById('site-menu');
            if (b && m) {
                b.addEventListener('click', () => {
                    const open = m.classList.contains('hidden');
                    m.classList.toggle('hidden', !open);
                    b.setAttribute('aria-expanded', String(open));
                });
            }
        });
    </script>
</body>
</html>`;

/* ---------- post pages ---------- */

const tagChip = (t) => `<span class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full">${escapeHtml(t)}</span>`;

// Linked variant — only for places NOT already wrapped in an <a> (post pages, tag cloud).
const tagLink = (t) => `<a href="/blog/tags/${slugify(t)}/" class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full hover:bg-primary-color/20 transition-colors">${escapeHtml(t)}</a>`;

// Discreet coupon-page footer link — only on posts tagged kubernetes,
// certification or docker, so it doesn't read as doorway behaviour on
// unrelated posts. Anchor text rotates so every post doesn't look identical.
const COUPON_FOOTER_TAGS = new Set(['kubernetes', 'certification', 'docker']);
const COUPON_FOOTER_ANCHORS = [
  '30% off the CKA, CKAD and CKS with code RUSHABH30',
  'a 30% discount code for Linux Foundation certifications',
  'save 30% on your next Kubernetes certification exam',
];
const couponFooterLink = (post, index) => {
  if (!post.tags.some(t => COUPON_FOOTER_TAGS.has(t.toLowerCase()))) return '';
  const anchor = COUPON_FOOTER_ANCHORS[index % COUPON_FOOTER_ANCHORS.length];
  // Alternate the destination so the hub gets internal-link equity from the
  // blog too, instead of every post feeding only the Linux Foundation page.
  const href = index % 3 === 2 ? '/coupons/' : '/linux-foundation-coupon/';
  return `<p class="font-fira text-sm text-gray-400 mt-5">Also: <a href="${href}" class="text-primary-color hover:underline">${anchor}</a>.</p>`;
};

// Series box shown at the top of every post that belongs to a series.
const seriesBox = (post) => {
  if (!post.series) return '';
  const parts = all.filter(p => p.series === post.series).sort((a, b) => a.date - b.date);
  if (parts.length < 2) return '';
  return `<aside class="tech-card p-5 rounded-md mb-8">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># Series: ${escapeHtml(post.series)} · ${parts.length} parts</p>
                <ol class="font-fira text-sm" style="list-style: decimal inside; margin: 0; padding: 0;">
                    ${parts.map(p => p.slug === post.slug
                      ? `<li class="text-white font-semibold" style="margin-top: 0.4em;">${escapeHtml(p.title)} <span class="text-gray-500 font-normal">(you are here)</span></li>`
                      : `<li style="margin-top: 0.4em;"><a href="/blog/${p.slug}/" class="text-gray-400 hover:text-primary-color">${escapeHtml(p.title)}</a></li>`).join('\n                    ')}
                </ol>
            </aside>`;
};

// Sticky "on this page" nav, built from the post's own h2/h3s. Skipped for
// short posts with fewer than 3 headings, since there's nothing to navigate.
const tocNav = (toc) => {
  if (toc.length < 3) return '';
  // h.text already comes out of marked's own HTML-escaped heading content
  // (addHeadingIds only strips tags, it doesn't touch entities), so it must
  // NOT be passed through escapeHtml() again here or "don't" becomes don&amp;#39;t.
  const links = toc.map(h =>
    `<a href="#${h.id}" data-toc-link="${h.id}" class="post-toc-link${h.level === 3 ? ' post-toc-sub' : ''}">${h.text}</a>`
  ).join('\n                    ');
  return `
        <aside class="post-toc" aria-label="Table of contents">
            <div class="post-toc-sticky">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># on this page</p>
                <nav class="post-toc-nav">
                    ${links}
                </nav>
            </div>
        </aside>`;
};

/* ---------- "read next" ----------

   Tag frequency across the whole blog. Used two ways: to pick the most
   *distinctive* tag for a card tile (below), and to weight related-post
   scoring here — it has to live above the post loop because that loop runs
   first. */
const tagFreq = new Map();
for (const p of all) for (const t of p.tags) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);

/* Every post ends with somewhere to go next. Two reasons: a reader who finishes
   a post has no reason to leave the site, and every post picks up inbound
   internal links from its siblings instead of hanging off /blog/ alone. Half
   the posts here currently have zero inbound links from another post.

   Ranking is shared tags weighted by rarity, not a plain overlap count: nearly
   everything is tagged `kubernetes`, so counting overlaps would score most
   pairs identically. Sharing `releases` (2 posts) is a real signal; sharing
   `kubernetes` (most of the blog) barely is. Ties break newest-first. */
const READ_NEXT_COUNT = 3;
const relatedPosts = (post) => {
  const own = new Set(post.tags.map(t => t.toLowerCase()));
  const picked = all
    .filter(p => p.slug !== post.slug)
    .map(p => ({
      p,
      score: p.tags.reduce((sum, t) =>
        own.has(t.toLowerCase()) ? sum + 1 / (tagFreq.get(t) || 1) : sum, 0),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.date - a.p.date)
    .map(x => x.p);

  // The chronological neighbours get their own row below, so keep them out of
  // the grid — otherwise most posts print the same two links twice.
  const i = all.indexOf(post);
  const neighbours = new Set([all[i + 1]?.slug, all[i - 1]?.slug]);
  return picked.filter(p => !neighbours.has(p.slug)).slice(0, READ_NEXT_COUNT);
};

const readNextCard = (p) => `
                    <a href="/blog/${p.slug}/" class="tech-card p-5 rounded-md block read-next-card">
                        <span class="read-next-meta">${fmtDate(p.date)} · ${p.minutes} min</span>
                        <h3>${escapeHtml(p.title)}</h3>
                    </a>`;

/* Chronological neighbours as well as the related grid. The grid answers "what
   else is on this topic"; this answers "what came before/after", which is what
   someone reading the archive in order actually wants. all is newest-first, so
   i+1 is older and i-1 is newer. */
const prevNextNav = (post) => {
  const i = all.indexOf(post);
  const older = all[i + 1];
  const newer = all[i - 1];
  if (!older && !newer) return '';
  // Deliberately quieter than the cards above: the cards are a recommendation,
  // this is just archive navigation, and five bordered boxes in a row at the
  // end of every post reads as a wall rather than a hierarchy.
  const link = (p, dir) => `<a href="/blog/${p.slug}/" class="block prevnext-link prevnext-${dir}">
                        <span class="prevnext-label">${dir === 'older' ? '← Older' : 'Newer →'}</span>
                        <span class="prevnext-title">${escapeHtml(p.title)}</span>
                    </a>`;
  return `
            <nav class="post-prevnext" aria-label="More posts">
                ${older ? link(older, 'older') : ''}
                ${newer ? link(newer, 'newer') : ''}
            </nav>`;
};

const readNextSection = (post) => {
  const related = relatedPosts(post);
  const nav = prevNextNav(post);
  if (!related.length && !nav) return '';
  const grid = related.length ? `
            <div class="read-next-grid">
                ${related.map(readNextCard).join('\n')}
            </div>` : '';
  return `
        <section class="post-readnext" aria-labelledby="read-next-heading">
            <h2 id="read-next-heading" class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># read next</h2>${grid}${nav}
        </section>`;
};

for (const [postIndex, post] of all.entries()) {
  const url = `${SITE}/blog/${post.slug}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.updated),
    url,
    author: { '@id': `${SITE}/#person` },
    keywords: post.tags.join(', '),
    ...(post.cover ? { image: `${SITE}${post.cover}` } : {}),
  };

  // Per-post view counter (GoatCounter public counter API) + copy-link button.
  // The counter stays invisible unless the API responds, so nothing breaks if
  // "Allow adding visitor counts" is off in the GoatCounter settings.
  const postScript = `<script>
    document.addEventListener('DOMContentLoaded', () => {
        const v = document.getElementById('post-views');
        if (v) fetch('https://rushabhshah.goatcounter.com/counter/' + location.pathname + '.json')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => {
                const n = (d.count || '').toString().replace(/\\s/g, ',');
                if (n) v.textContent = '· ' + n + ' views';
            })
            .catch(() => {});
        const c = document.getElementById('copy-link');
        if (c) c.addEventListener('click', () => {
            navigator.clipboard.writeText(c.dataset.url).then(() => {
                c.classList.add('copied');
                const t = c.textContent;
                c.textContent = 'Copied!';
                setTimeout(() => { c.textContent = t; c.classList.remove('copied'); }, 2000);
            }).catch(() => {});
        });
        const progressBar = document.getElementById('reading-progress-bar');
        if (progressBar) {
            const article = document.querySelector('.post-article');
            let ticking = false;
            const update = () => {
                ticking = false;
                const total = article.offsetHeight - window.innerHeight;
                const pct = total > 0 ? Math.min(1, Math.max(0, (window.scrollY - article.offsetTop + 200) / total)) : 0;
                progressBar.style.transform = 'scaleX(' + pct + ')';
            };
            document.addEventListener('scroll', () => {
                if (!ticking) { ticking = true; requestAnimationFrame(update); }
            }, { passive: true });
            update();
        }
        const s = document.getElementById('native-share');
        if (s && navigator.share) {
            s.classList.remove('hidden');
            s.addEventListener('click', () => {
                navigator.share({ title: s.dataset.title, url: s.dataset.url }).catch(() => {});
            });
        }
        const tocLinks = document.querySelectorAll('.post-toc-link');
        if (tocLinks.length) {
            const byId = new Map();
            tocLinks.forEach(a => {
                const heading = document.getElementById(a.dataset.tocLink);
                if (heading) byId.set(heading, a);
            });
            let current = null;
            const setActive = (link) => {
                tocLinks.forEach(a => a.classList.toggle('active', a === link));
            };
            // A thin band across the top ~30% of the viewport. Whichever heading
            // most recently entered it stays "current" until the next one does,
            // so the highlight doesn't reset while a heading scrolls past upward.
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => { if (entry.isIntersecting) current = entry.target; });
                if (current) setActive(byId.get(current));
            }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });
            byId.forEach((_link, heading) => observer.observe(heading));

            // Explicit smooth animation for in-page TOC clicks (heading ids are
            // already in the static HTML, so the browser's own default jump
            // works fine on its own — this just makes clicking one feel nicer).
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            tocLinks.forEach(a => {
                a.addEventListener('click', (e) => {
                    const heading = document.getElementById(a.dataset.tocLink);
                    if (!heading) return;
                    e.preventDefault();
                    heading.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
                    history.pushState(null, '', '#' + a.dataset.tocLink);
                });
            });
        }
    });
    </script>`;

  const html = `${head({ title: `${post.title} · ${AUTHOR}`, description: post.description, url, ogType: 'article', published: post.date, updated: post.updated, tags: post.tags, image: post.cover })}
<body>
    <div id="reading-progress" aria-hidden="true"><div id="reading-progress-bar"></div></div>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="post-layout">
        <article class="post-article max-w-3xl">
            <p class="font-fira text-sm mb-8"><a href="/blog/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../blog</a></p>
            <header class="mb-10">
                <h1 class="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">${escapeHtml(post.title)}</h1>
                <div class="flex flex-wrap items-center gap-3 font-fira text-sm text-gray-400">
                    <time datetime="${isoDate(post.date)}">${fmtDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>${post.minutes} min read</span>
                    <span id="post-views"></span>
                    ${post.tags.length ? `<span aria-hidden="true">·</span> ${post.tags.map(tagLink).join(' ')}` : ''}
                </div>
                ${post.cover ? `<img src="${post.cover}" alt="" class="w-full rounded-xl border border-border-color mt-8" loading="eager" decoding="async">` : ''}
            </header>
            ${seriesBox(post)}
            <div class="post-prose">
${post.html}
            </div>
            <footer class="mt-12 pt-6 border-t border-border-color">
                <div class="flex flex-wrap items-center gap-3 font-fira text-sm">
                    <span class="text-gray-400">Share:</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="chip">X / Twitter</a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="chip">LinkedIn</a>
                    <button type="button" id="copy-link" class="chip" data-url="${url}">Copy link</button>
                    <button type="button" id="native-share" class="chip hidden" data-title="${escapeHtml(post.title)}" data-url="${url}">Share…</button>
                    <a href="/blog/rss.xml" class="chip">RSS</a>
                </div>
                <p class="font-fira text-sm text-gray-400 mt-5">Thanks for reading. <a href="/#contact" class="text-primary-color hover:underline">Say hi</a> if it was useful.</p>
                ${couponFooterLink(post, postIndex)}
            </footer>
        </article>
        ${tocNav(post.toc)}
        </div>
${readNextSection(post)}
    </main>
${footer.replace('</body>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n${postScript}\n</body>`)}`;

  const dir = path.join(OUT_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  // llms.txt-spec markdown mirror, from the original markdown source (higher
  // fidelity than re-deriving it from the rendered HTML).
  const postMd = `# ${post.title}\n\n> ${post.description}\n\nPublished: ${isoDate(post.date).slice(0, 10)} · Updated: ${isoDate(post.updated).slice(0, 10)} · Tags: ${post.tags.join(', ') || 'none'}\nCanonical: ${url}\n\n${post.rawContent}\n`;
  fs.writeFileSync(path.join(dir, 'index.html.md'), postMd);

  console.log(`✅ built     /blog/${post.slug}/`);
}

/* ---------- blog index ---------- */

/* ---------- post cards ---------- */

/* Every post card gets a media slot whether or not the post has a cover, so a
   list mixing illustrated and plain posts still reads as one grid instead of
   some cards starting 200px further left than others. Without a cover we draw
   a tinted tile carrying the post's primary tag. The tint is derived from the
   slug, so it's stable across builds but differs between neighbours. Once a
   post gets a real banner the fallback simply stops firing. */
const CARD_TINTS = ['var(--primary-rgb)', 'var(--purple-rgb)', 'var(--green-rgb)', 'var(--orange-rgb)'];
const cardTint = (slug) => {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return CARD_TINTS[h % CARD_TINTS.length];
};
/* Label the tile with the post's *rarest* tag rather than its first. Nearly
   every post here is tagged `kubernetes`, so leading with the first tag would
   print the same word on every tile; the rarest one is the one that actually
   tells them apart. */
const distinctTag = (tags) =>
  [...tags].sort((a, b) => (tagFreq.get(a) - tagFreq.get(b)) || a.localeCompare(b))[0];

const cardMedia = (p, extraClass = '') => {
  const cls = `post-card-media${extraClass ? ' ' + extraClass : ''}`;
  if (p.cover) {
    return `<div class="${cls}"><img src="${p.cover}" alt="" loading="lazy" decoding="async"></div>`;
  }
  const label = p.tags.length ? `#${distinctTag(p.tags)}` : '$ post';
  return `<div class="${cls} post-card-media-blank" style="--card-tint: ${cardTint(p.slug)}" aria-hidden="true"><span>${escapeHtml(label)}</span></div>`;
};

const postCard = (p, { pinned = false } = {}) => `
                    <a href="/blog/${p.slug}/" class="tech-card p-6 rounded-md group block${pinned ? ' pinned-card' : ''}">
                        <div class="post-card-row flex flex-col sm:flex-row gap-5">
                            ${cardMedia(p)}
                            <div class="flex flex-col min-w-0">
                                <div class="flex flex-wrap items-center gap-3 font-fira text-xs text-gray-400 mb-2">
                                    ${pinned ? `<span class="text-primary-color">★ Pinned</span><span aria-hidden="true">·</span>` : ''}
                                    <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
                                    <span aria-hidden="true">·</span>
                                    <span>${p.minutes} min read</span>
                                </div>
                                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary-color transition-colors">${escapeHtml(p.title)}</h3>
                                ${p.description ? `<p class="text-gray-400 text-sm leading-relaxed mb-3">${escapeHtml(p.description)}</p>` : ''}
                                ${p.tags.length ? `<div class="flex flex-wrap gap-2 mt-auto">${p.tags.map(tagChip).join(' ')}</div>` : ''}
                            </div>
                        </div>
                    </a>`;

const featured = all.filter(p => p.featured);
const unpinned = all.filter(p => !p.featured);

const byYear = new Map();
for (const p of unpinned) {
  const y = p.date.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(p);
}

// Tease posts scheduled within the next 90 days (title + date only, no link).
const NINETY_DAYS = 90 * 24 * 3600 * 1000;
const upcoming = scheduled
  .filter(s => s.date - now < NINETY_DAYS)
  .sort((a, b) => a.date - b.date)
  .slice(0, 3);

// Tag cloud with counts, biggest first.
const tagCounts = new Map();
for (const p of all) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const featuredSection = featured.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># pinned</h2>
                <div class="space-y-4">
                ${featured.map(p => postCard(p, { pinned: true })).join('')}
                </div>
            </section>` : '';

const upcomingSection = upcoming.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># coming soon</h2>
                <div class="space-y-2">
                ${upcoming.map(s => `
                    <p class="font-fira text-sm text-gray-400"><span class="text-green-color">⏰</span> ${escapeHtml(s.title)} <span class="text-gray-500">· ${fmtDate(s.date)}</span></p>`).join('')}
                </div>
            </section>` : '';

const tagCloudSection = sortedTags.length ? `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># browse by tag</h2>
                <div class="flex flex-wrap gap-2">
                    ${sortedTags.map(([t, n]) => `<a href="/blog/tags/${slugify(t)}/" class="chip">${escapeHtml(t)} <span class="text-gray-500">${n}</span></a>`).join('\n                    ')}
                </div>
            </section>` : '';

const yearSections = [...byYear.entries()].map(([year, posts]) => `
            <section class="mb-12">
                <h2 class="font-fira text-sm uppercase tracking-wider text-gray-500 mb-5"># ${year}</h2>
                <div class="space-y-4">
                ${posts.map(p => postCard(p)).join('')}
                </div>
            </section>`).join('');

const couponPromoSection = `
            <section class="mb-12">
                <a href="/linux-foundation-coupon/" class="tech-card p-5 rounded-md flex flex-col md:flex-row items-center justify-between gap-4 group block">
                    <span class="text-sm text-gray-300">🎓 Prepping for the CKA, CKAD or CKS? Code <span class="text-primary-color font-bold">RUSHABH30</span> takes 30% off every Linux Foundation certification, all year.</span>
                    <span class="btn btn-ghost flex-shrink-0">Get the discount →</span>
                </a>
            </section>`;

const indexBody = all.length === 0
  ? `<p class="text-gray-400 font-fira text-center py-12">No posts yet. First one is coming soon.</p>`
  : couponPromoSection + featuredSection + upcomingSection + yearSections + tagCloudSection;

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': `${SITE}/blog/#blog`,
  name: BLOG_TITLE,
  url: `${SITE}/blog/`,
  description: BLOG_DESC,
  author: { '@id': `${SITE}/#person` },
};

const indexHtml = `${head({ title: `Blog · ${AUTHOR}`, description: BLOG_DESC, url: `${SITE}/blog/` })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="max-w-3xl mx-auto">
            <header class="mb-12">
                <h1 class="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                    <span class="gradient-text">Blog</span>
                </h1>
                <p class="font-fira text-sm text-gray-400"><span class="text-green-color">$</span> ls ~/blog · DevOps, Kubernetes, observability, cloud cost &amp; Linux. <a href="/blog/rss.xml" class="text-primary-color hover:underline">Subscribe via RSS</a>.</p>
            </header>
${indexBody}
        </div>
    </main>
${footer.replace('</body>', `<script type="application/ld+json">${JSON.stringify(blogJsonLd)}</script>\n</body>`)}`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);

const blogIndexMd = `# ${BLOG_TITLE}\n\n> ${BLOG_DESC}\n\n${all.length ? all.map(p =>
  `- [${p.title}](${SITE}/blog/${p.slug}/) (${isoDate(p.date).slice(0, 10)}): ${p.description}`).join('\n')
  : 'No posts yet.'}\n`;
fs.writeFileSync(path.join(OUT_DIR, 'index.html.md'), blogIndexMd);

console.log('✅ built     /blog/');

/* ---------- tag pages ---------- */

const TAGS_DIR = path.join(OUT_DIR, 'tags');
fs.rmSync(TAGS_DIR, { recursive: true, force: true }); // drop stale tags from renamed/deleted posts
for (const [tag] of sortedTags) {
  const tSlug = slugify(tag);
  const posts = all.filter(p => p.tags.includes(tag));
  const url = `${SITE}/blog/tags/${tSlug}/`;
  const tagJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collectionpage`,
    name: `Posts tagged "${tag}"`,
    url,
    description: `All posts tagged ${tag}. ${BLOG_DESC}`,
    author: { '@id': `${SITE}/#person` },
  };
  const tagHtml = `${head({ title: `Posts tagged “${tag}” · ${AUTHOR}`, description: `All posts tagged ${tag}. ${BLOG_DESC}`, url })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <div class="max-w-3xl mx-auto">
            <header class="mb-12">
                <p class="font-fira text-sm mb-6"><a href="/blog/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../blog</a></p>
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                    Tagged: <span class="gradient-text">${escapeHtml(tag)}</span>
                </h1>
                <p class="font-fira text-sm text-gray-400">${posts.length} post${posts.length === 1 ? '' : 's'}</p>
            </header>
            <div class="space-y-4">
            ${posts.map(p => postCard(p)).join('')}
            </div>
        </div>
    </main>
${footer.replace('</body>', `<script type="application/ld+json">${JSON.stringify(tagJsonLd)}</script>\n</body>`)}`;
  const dir = path.join(TAGS_DIR, tSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), tagHtml);

  const tagMd = `# Posts tagged "${tag}"\n\n${posts.map(p =>
    `- [${p.title}](${SITE}/blog/${p.slug}/) (${isoDate(p.date).slice(0, 10)}): ${p.description}`).join('\n')}\n`;
  fs.writeFileSync(path.join(dir, 'index.html.md'), tagMd);
}
if (sortedTags.length) console.log(`✅ built     /blog/tags/ (${sortedTags.length} tag page(s))`);

/* ---------- posts.json (for homepage widgets) ---------- */

fs.writeFileSync(path.join(OUT_DIR, 'posts.json'), JSON.stringify(
  all.slice(0, 6).map(p => ({
    title: p.title, description: p.description, url: `/blog/${p.slug}/`,
    date: isoDate(p.date), tags: p.tags, minutes: p.minutes, cover: p.cover,
  })), null, 2));

/* ---------- RSS ---------- */

// RSS's lastBuildDate is the last time feed CONTENT changed, not build time —
// using build time would leave `blog/rss.xml` dirty on every rebuild even
// when no post changed, forcing a commit (and a full Pages redeploy) daily.
const lastBuild = all.length ? new Date(Math.max(...all.map(p => +p.updated))) : now;

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BLOG_TITLE)}</title>
    <link>${SITE}/blog/</link>
    <description>${escapeXml(BLOG_DESC)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${all.slice(0, 20).map(p => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
      ${p.tags.map(t => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`).join('\n')}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), rss);
console.log('✅ built     /blog/rss.xml');

/* ---------- sitemap.xml ---------- */

const sitemapUrls = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'monthly', lastmod: gitLastMod('index.html') },
  { loc: `${SITE}/blog/`, priority: '0.9', changefreq: 'weekly', lastmod: all.length ? isoDate(all[0].updated).slice(0, 10) : null },
  { loc: `${SITE}/linux-foundation-coupon/`, priority: '0.9', changefreq: 'weekly', lastmod: gitLastMod('linux-foundation-coupon/index.html') },
  ...CERT_PAGES.map(c => ({ loc: `${SITE}/linux-foundation-coupon/${c.slug}/`, priority: '0.8', changefreq: 'weekly', lastmod: gitLastMod(`linux-foundation-coupon/${c.slug}/index.html`) })),
  { loc: `${SITE}/coupons/`, priority: '0.9', changefreq: 'weekly', lastmod: gitLastMod('coupons/index.html') },
  { loc: `${SITE}/finops-coupon/`, priority: '0.9', changefreq: 'weekly', lastmod: gitLastMod('finops-coupon/index.html') },
  ...FINOPS_PAGES.map(f => ({ loc: `${SITE}/finops-coupon/${f.slug}/`, priority: '0.8', changefreq: 'weekly', lastmod: gitLastMod(`finops-coupon/${f.slug}/index.html`) })),
  { loc: `${SITE}/docker-captain/`, priority: '0.7', changefreq: 'monthly', lastmod: gitLastMod('docker-captain/index.html') },
  { loc: `${SITE}/links/`, priority: '0.5', changefreq: 'monthly', lastmod: gitLastMod('links/index.html') },
  { loc: `${SITE}/privacy/`, priority: '0.2', changefreq: 'yearly', lastmod: gitLastMod('privacy/index.html') },
  ...all.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, priority: '0.8', lastmod: isoDate(p.updated).slice(0, 10) })),
  ...sortedTags.map(([t]) => {
    const tagPosts = all.filter(p => p.tags.includes(t));
    const lastmod = tagPosts.length ? isoDate(new Date(Math.max(...tagPosts.map(p => +p.updated)))).slice(0, 10) : null;
    return { loc: `${SITE}/blog/tags/${slugify(t)}/`, priority: '0.3', changefreq: 'weekly', lastmod };
  }),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => {
  const children = [
    `<loc>${u.loc}</loc>`,
    u.lastmod && `<lastmod>${u.lastmod}</lastmod>`,
    u.changefreq && `<changefreq>${u.changefreq}</changefreq>`,
    `<priority>${u.priority}</priority>`,
  ].filter(Boolean);
  return `  <url>\n${children.map(c => `    ${c}`).join('\n')}\n  </url>`;
}).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('✅ built     /sitemap.xml');

/* ---------- freshness stamp: coupon page ----------
   Coupon-query SERPs reward visible freshness. The hourly CI build re-stamps
   the coupon page's title and "Updated ..." line with the current month, so
   the page advertises this month's date forever with zero manual work. */

const MONTH_YEAR = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
/* ---------- live-sale rendering ----------
   swapRegion() rewrites everything between a matched pair of
   <!-- MARKER:START --> / <!-- MARKER:END --> comments, leaving the comments
   themselves in place so the next build can find the region again. That's what
   makes the sale banner reversible on hand-authored pages: when the window
   closes, the same call writes the region back to empty (or to the evergreen
   line) without anyone editing HTML. */
const swapRegion = (html, marker, inner) => {
  const re = new RegExp(`(<!-- ${marker}:START -->)[\\s\\S]*?(<!-- ${marker}:END -->)`);
  if (!re.test(html)) {
    console.warn(`⚠️  region "${marker}" not found — skipped`);
    return html;
  }
  // Replacer FUNCTION, not a string: `inner` carries "$" sequences (prices,
  // and "~$'" from the CSS-adjacent copy) that a string replacement would
  // treat as substitution patterns.
  return html.replace(re, (_m, open, close) => `${open}${inner}${close}`);
};

const copyBtn = (code) => `<button type="button" class="chip copy-code" data-code="${code}" aria-label="Copy coupon code ${code}">Copy</button>`;

/* The banner body, shared by the coupon page and every per-cert page. Empty
   string when no sale is live, which is what makes the region self-retiring. */
const saleBannerHtml = () => {
  if (!saleLive) return '';
  const { name, advertisedEnd, courses, bundles } = SALE;
  const top = Math.max(courses.pct, bundles.pct);
  return `
                <div id="current-sale" class="tech-card tech-card-sale p-5 rounded-md mb-8">
                    <p class="status-pill mb-3"><span class="dot"></span> Sale live now &middot; ends ${escapeHtml(advertisedEnd)}</p>
                    <p class="text-white font-bold text-lg mb-2">Linux Foundation ${escapeHtml(name)}: up to ${top}% off</p>
                    <p class="text-gray-400 text-sm leading-relaxed mb-4">
                        For a few days only, the official sale beats RUSHABH30. Use <code>${courses.code}</code> for
                        ${courses.pct}% off ${escapeHtml(courses.what)}, or <code>${bundles.code}</code> for
                        ${bundles.pct}% off ${escapeHtml(bundles.what)}. Sale codes don't stack with RUSHABH30, so take
                        the bigger number while it's running. RUSHABH30 goes back to being the best price here at 30%
                        the day the sale closes.
                    </p>
                    <p class="text-gray-500 text-xs leading-relaxed mb-4">
                        On the date: the announcement's own copy says ${escapeHtml(SALE.copyEnd)} while its offer terms
                        run to 2:59 AM ET on August 29. ${escapeHtml(SALE.advertisedEnd)} is the safe last day to buy.
                    </p>
                    <div class="flex flex-wrap items-center gap-4">
                        <span class="code-box">${courses.code}${copyBtn(courses.code)}</span>
                        <span class="code-box">${bundles.code}${copyBtn(bundles.code)}</span>
                        <a href="${saleLink}" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-sale-banner" data-goatcounter-title="Live sale banner CTA">Shop the sale &rarr;</a>
                    </div>
                </div>`;
};

/* The one-liner directly above the RUSHABH30 code box on the coupon page. */
/* Once a sale's window closes the banner disappears, but the archive entry
   describing it has to appear, or the page quietly loses the record of a sale
   that just happened. That list is the page's main argument for *when* to buy,
   so leaving it to a manual edit meant the most valuable section decayed first.
   Rendered from the same SALE object: nothing while it's live (the banner has
   it), an archive bullet the moment it expires. */
const pastSaleAutoHtml = () => {
  if (!SALE || saleLive) return '';
  const top = Math.max(SALE.courses.pct, SALE.bundles.pct);
  return `<li><strong>${escapeHtml(SALE.name)}, ${new Date(SALE.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>: up to ${top}% off (${SALE.courses.pct}% on courses and certifications with ${SALE.courses.code}, ${SALE.bundles.pct}% on bundles with ${SALE.bundles.code}), ended ${escapeHtml(SALE.advertisedEnd)}.</li>`;
};

const saleIntroHtml = () => saleLive
  ? `<p class="font-fira text-xs text-gray-400 mb-3">A sale is running right now (see above). Once it ends, this is the everyday code, and it works year-round:</p>`
  : `<p class="font-fira text-xs text-gray-400 mb-3">No sale running right now. This is the everyday code, works year-round:</p>`;

/* The homepage deals card. Same card, different pitch while a sale is on. */
const saleHomeCardHtml = () => saleLive
  ? `
                <span class="status-pill mb-1"><span class="dot"></span> Sale live &middot; ends ${escapeHtml(SALE.advertisedEnd)}</span>
                <p class="text-sm text-gray-300 leading-relaxed">
                    <span class="font-fira font-bold text-primary-color">${SALE.courses.code}</span>: the Linux Foundation
                    ${escapeHtml(SALE.name)} is live: <strong class="text-white">${SALE.courses.pct}% off certifications</strong>
                    and <strong class="text-white">${SALE.bundles.pct}% off bundles</strong>, for a few days only. My evergreen
                    <span class="font-fira text-primary-color">RUSHABH30</span> code takes over at 30% when it ends.
                </p>`
  : `
                <p class="text-sm text-gray-300 leading-relaxed">
                    <span class="font-fira font-bold text-primary-color">RUSHABH30</span>: as a Linux Foundation Education partner, my community gets <strong class="text-white">30% off all Linux Foundation certifications</strong> (CKA, CKAD, CKS, KCNA) and courses, all year round.
                </p>`;

if (saleLive) {
  console.log(`🔥 sale live  ${SALE.courses.code} / ${SALE.bundles.code} until ${SALE.end}`);
} else if (SALE) {
  console.log(`💤 sale idle  window ${SALE.start} → ${SALE.end} is not open; evergreen copy rendered`);
}

/* ---------- sale-alert capture box ----------
   Rendered at the points where a reader is already weighing "buy now or wait":
   under the sale archive on the coupon page, under the FAQ on each cert page,
   and on the /coupons/ hub. Never as a popup — these pages earn their
   conversions on tone, and an interstitial would spend that credibility for a
   handful of addresses.

   `context` distinguishes which catalog the reader is looking at so the copy
   names the right code, and rides along in a hidden field so the dashboard
   shows which page actually converts rather than one undifferentiated list.

   Progressive enhancement: the <form> posts natively if the inline script never
   runs. The script only upgrades it to a fetch so the reader isn't bounced to a
   Pageclip confirmation page and loses their place on a long page. */
const signupBoxHtml = ({ context = 'linux-foundation', heading, blurb } = {}) => {
  if (!signupLive) return '';
  const id = `signup-${context}`;
  return `
            <aside class="tech-card p-5 rounded-md mt-8" id="sale-alerts" aria-labelledby="${id}-h">
                <p class="font-fira text-xs uppercase tracking-wider text-primary-color mb-3"># Sale alerts</p>
                <h2 id="${id}-h" class="text-white font-bold text-lg mb-2">${escapeHtml(heading)}</h2>
                <p class="text-gray-400 text-sm leading-relaxed mb-4">${blurb}</p>
                <form class="signup-form flex flex-wrap items-center gap-3" method="post" novalidate data-context="${context}">
                    <label class="sr-only" for="${id}-email">Email address</label>
                    <input class="form-input flex-1 min-w-[220px]" id="${id}-email" type="email" name="email"
                           inputmode="email" autocomplete="email" required placeholder="you@example.com">
                    <div class="honeypot" aria-hidden="true">
                        <label for="${id}-website">Website</label>
                        <input id="${id}-website" type="text" name="website" tabindex="-1" autocomplete="off">
                    </div>
                    <input type="hidden" name="source" value="${context}">
                    <input type="hidden" name="page" value="">
                    <input type="hidden" name="loaded_at" value="">
                    <button class="btn btn-primary" type="submit">Notify me &rarr;</button>
                    <p class="signup-status font-fira text-xs w-full" role="status" aria-live="polite"></p>
                </form>
                <p class="text-gray-500 text-xs leading-relaxed mt-3">
                    ${escapeHtml(SIGNUP.cadence)} No spam, no selling your address, unsubscribe any time by replying.
                    See the <a href="/privacy/" class="text-primary-color hover:underline">privacy page</a> for what I store and how to have it deleted.
                </p>
            </aside>
            <script>
            (function(){
              var f = document.querySelector('form.signup-form');
              if (!f || f.dataset.wired) return;
              f.dataset.wired = '1';
              // Assembled at submit time only, same reasoning as the contact form:
              // the raw HTML never contains a POSTable URL for scrapers to harvest.
              var K = ${JSON.stringify(SIGNUP.keyParts)};
              var page = f.querySelector('[name=page]');
              var loaded = f.querySelector('[name=loaded_at]');
              if (page) page.value = location.pathname;
              if (loaded) loaded.value = String(Date.now());
              var status = f.querySelector('.signup-status');
              var focused = false;
              var email = f.querySelector('input[type=email]');
              email.addEventListener('focus', function(){ focused = true; });
              function say(msg, ok){
                if (!status) return;
                status.textContent = msg;
                status.style.color = ok ? 'var(--green-color)' : 'var(--primary-color)';
              }
              f.addEventListener('submit', function(e){
                e.preventDefault();
                if (!email.value || email.validity.typeMismatch) { say('That email address looks incomplete.', false); return; }
                // Bots fill fields without focusing them and submit near-instantly.
                if (f.querySelector('[name=website]').value) return;
                if (!focused || Date.now() - Number(loaded.value || 0) < 1500) { say('Something went wrong. Try again in a moment.', false); return; }
                var btn = f.querySelector('button[type=submit]');
                btn.disabled = true;
                say('Adding you…', true);
                fetch('https://send.pageclip' + '.co/' + K.join(''), {
                  method: 'POST', body: new FormData(f), mode: 'no-cors'
                }).then(function(){
                  f.reset();
                  say('Done. You will hear from me before the next sale, not after.', true);
                  if (window.goatcounter && window.goatcounter.count) {
                    window.goatcounter.count({ path: 'signup-' + f.dataset.context, title: 'Sale alert signup', event: true });
                  }
                }).catch(function(){
                  say('Network error. Try again, or email contact@rushabhshah.dev.', false);
                }).finally(function(){ btn.disabled = false; loaded.value = String(Date.now()); });
              });
            })();
            </script>`;
};

const signupLF = () => signupBoxHtml({
  context: 'linux-foundation',
  heading: 'Get told before the next sale, not after',
  blurb: `The table above is the pattern: a few times a year the Linux Foundation runs a sale that beats <code>RUSHABH30</code>. As an affiliate partner I get the heads-up before those go public, so I can tell you while there's still time to use it rather than writing it up afterwards.`,
});

const signupFinOps = () => signupBoxHtml({
  context: 'finops',
  heading: 'Told first when FinOps pricing moves',
  blurb: `FinOps Foundation pricing and promotions change without much warning, and <code>${FINOPS_CODE}</code> covers five specific offerings that could be revised. Leave an address and I'll tell you when something changes that affects what you'd pay, including if a better offer than mine turns up.`,
});

const signupHub = () => signupBoxHtml({
  context: 'coupons-hub',
  heading: 'One email when a sale beats these codes',
  blurb: `Both partner programmes give me advance notice of sales. Rather than checking back, leave an address and I'll tell you when a discount lands that's genuinely better than the everyday codes on this page.`,
});


const couponPath = path.join(ROOT, 'linux-foundation-coupon', 'index.html');
if (fs.existsSync(couponPath)) {
  const c = fs.readFileSync(couponPath, 'utf8');
  const couponMod = gitLastMod('linux-foundation-coupon/index.html') || now.toISOString().slice(0, 10);

  /* Person node: the homepage copy is canonical (it carries award,
     hasCredential and image). Copy it verbatim onto the coupon page so two
     @id-identical nodes can never describe different people.
     The (?:(?!<\/script>)[^])*? guard is load-bearing: without it, the lazy
     [^]*? happily spans past this block's own </script> into a sibling
     <script> tag, so on a page with multiple JSON-LD blocks (FAQPage,
     BreadcrumbList, WebPage, then Person) it matches from the FIRST script
     tag through to Person's closing tag and swallows every block in between. */
  const PERSON_RE = /<script type="application\/ld\+json">(?:(?!<\/script>)[^])*?"@type":\s*"Person"(?:(?!<\/script>)[^])*?<\/script>/;
  const personBlock = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(PERSON_RE)?.[0];

  let stamped = c
    .replace(/(<title>Linux Foundation Coupon )\([^)]*\)/, `$1(${MONTH_YEAR})`)
    .replace(/Updated [A-Za-z]+ \d{4}/g, `Updated ${MONTH_YEAR}`)
    .replace(/last updated this page \([^)]*\)/, `last updated this page (${MONTH_YEAR})`)
    .replace(/("dateModified":\s*")[^"]*(")/, `$1${couponMod}$2`)
    .replace(/Last verified: [A-Za-z]+ \d{4}/g, `Last verified: ${MONTH_YEAR}`);
  stamped = swapRegion(stamped, 'SALE-BANNER', saleBannerHtml());
  stamped = swapRegion(stamped, 'SALE-INTRO', saleIntroHtml());
  stamped = swapRegion(stamped, 'SIGNUP-BOX', signupLF());
  stamped = swapRegion(stamped, 'PAST-SALE-AUTO', pastSaleAutoHtml());
  if (personBlock) {
    // Replacer FUNCTION, not a string: a string replacement would interpret
    // any "$&"/"$'" etc. inside personBlock's JSON as a substitution pattern.
    stamped = stamped.replace(PERSON_RE, () => personBlock);
  } else {
    console.warn('⚠️  could not find the Person JSON-LD block on index.html — skipping Person sync on the coupon page');
  }
  if (stamped !== c) {
    fs.writeFileSync(couponPath, stamped);
    console.log(`✅ stamped   /linux-foundation-coupon/ (${MONTH_YEAR})`);
  }
  const bareLinks = (stamped.match(/href="https:\/\/training\.linuxfoundation\.org\//g) || []).length;
  if (bareLinks) {
    console.warn(`⚠️  ${bareLinks} untracked affiliate link(s) on /linux-foundation-coupon/ — replace with the AWIN URL`);
  }
}

/* ---------- inline CSS into standalone pages ----------
   Replaces the render-blocking <link href="/style.css"> on hand-authored pages
   with an inlined, minified <style> tag (first paint needs no CSS request).
   Idempotent: re-runs refresh the existing inlined tag from style.css. */

const cssMin = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')   // strip comments
  .replace(/\s+/g, ' ')               // collapse whitespace
  .replace(/ *([{};,]) */g, '$1')     // trim around structural chars
  .replace(/: /g, ':')                // trim after colons (safe: descendant-combinator spaces sit before the colon)
  .trim();

for (const page of ['index.html', 'linux-foundation-coupon/index.html', 'privacy/index.html', 'links/index.html', 'docker-captain/index.html']) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const styleTag = `<style data-inline-css>${cssMin}</style>`;
  // Replacer FUNCTION, not a string: the CSS contains "~$'" which a string
  // replacement would interpret as the $' substitution pattern (inserts the
  // rest of the document into the style tag).
  const next = html
    .replace(/<link rel="stylesheet" href="\/style\.css">/, () => styleTag)
    .replace(/<style data-inline-css>[\s\S]*?<\/style>/, () => styleTag);
  if (next !== html) {
    fs.writeFileSync(p, next);
    const label = page === 'index.html' ? '/' : `/${page.replace('/index.html', '/')}`;
    console.log(`✅ inlined   ${label} CSS (${Math.round(cssMin.length / 1024)} KiB)`);
  }
}

/* ---------- dedicated per-certification discount pages ----------
   Generated fully at build time (unlike the hand-authored coupon page, so no
   regex-stamping needed — the correct month/date is just interpolated once).
   CSS is embedded pre-minified from the start; no separate inlining pass. */

/* One header for every generated deals page. `dealsHref` decides which section
   the ./deals nav item points at and marks as current, so a FinOps page's nav
   sends you back to /finops-coupon/ rather than to the Linux Foundation one. */
const dealsHeader = (dealsHref = '/linux-foundation-coupon/') => `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="hidden xl:flex items-center space-x-6 text-sm nav-links">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors">./about</a>
                <a href="/#honors" class="text-gray-400 hover:text-primary-color transition-colors">./honors</a>
                <a href="/#skills" class="text-gray-400 hover:text-primary-color transition-colors">./skills</a>
                <a href="/#experience" class="text-gray-400 hover:text-primary-color transition-colors">./experience</a>
                <a href="/#projects" class="text-gray-400 hover:text-primary-color transition-colors">./projects</a>
                <a href="/blog/" class="text-gray-400 hover:text-primary-color transition-colors">./blog</a>
                <a href="${dealsHref}" class="text-primary-color transition-colors" aria-current="true">./deals</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
            </div>
            <div class="hidden xl:flex flex-shrink-0">
                ${segControl(true)}
            </div>
            <button id="menu-btn" class="xl:hidden" aria-controls="site-menu" aria-expanded="false" aria-label="Toggle navigation menu">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
        </nav>
        <div id="site-menu" class="hidden xl:hidden bg-terminal-header/90 font-fira">
            <a href="/#about" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./about</a>
            <a href="/#honors" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./honors</a>
            <a href="/#skills" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./skills</a>
            <a href="/#experience" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./experience</a>
            <a href="/#projects" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./projects</a>
            <a href="/blog/" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./blog</a>
            <a href="${dealsHref}" class="block py-2 px-4 text-sm text-primary-color">./deals</a>
            <a href="/#contact" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./contact</a>
            ${segControl(false)}
        </div>
    </header>`;

const certHeader = dealsHeader('/linux-foundation-coupon/');
const finopsHeader = dealsHeader('/finops-coupon/');

const certFooter = `
    <footer class="border-t border-border-color mt-10">
        <div class="container mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-fira text-gray-500">
            <p>&copy; <span id="footer-year">${now.getFullYear()}</span> ${AUTHOR} &middot; Designed &amp; built with care.</p>
            <div class="flex flex-wrap gap-4">
                <a href="https://github.com/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">GitHub</a>
                <a href="https://in.linkedin.com/in/iamrushabhshahh" target="_blank" rel="noopener noreferrer" class="hover:text-primary-color">LinkedIn</a>
                <a href="/blog/rss.xml" class="hover:text-primary-color">RSS</a>
                <a href="/privacy/" class="hover:text-primary-color">Privacy</a>
            </div>
        </div>
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const y = document.getElementById('footer-year');
            if (y) y.textContent = new Date().getFullYear();
            document.querySelectorAll('.copy-code').forEach(btn => {
                btn.addEventListener('click', () => {
                    navigator.clipboard.writeText(btn.dataset.code).then(() => {
                        btn.classList.add('copied');
                        const t = btn.textContent;
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = t; btn.classList.remove('copied'); }, 2000);
                    }).catch(() => {});
                });
            });
            const b = document.getElementById('menu-btn');
            const m = document.getElementById('site-menu');
            if (b && m) {
                b.addEventListener('click', () => {
                    const open = m.classList.contains('hidden');
                    m.classList.toggle('hidden', !open);
                    b.setAttribute('aria-expanded', String(open));
                });
            }
        });
    </script>`;

function certPageHtml(c, siblings) {
  const url = `${SITE}/linux-foundation-coupon/${c.slug}/`;
  const title = `${c.name} Discount Code (${MONTH_YEAR}): 30% Off with RUSHABH30 · ${AUTHOR}`;
  const description = `Code RUSHABH30 gets 30% off the ${c.fullName}${c.isBundle ? '' : ` (${c.name}) exam`}: ~$${c.priceDiscounted} instead of $${c.priceList}. Verified partner code, no expiry.`;
  const savings = c.priceList - c.priceDiscounted;
  const cModPath = `linux-foundation-coupon/${c.slug}/index.html`;
  const dateModified = gitLastMod(cModPath) || now.toISOString().slice(0, 10);

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: c.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Linux Foundation Coupon', item: `${SITE}/linux-foundation-coupon/` },
      { '@type': 'ListItem', position: 3, name: `${c.name} Discount`, item: url },
    ],
  };
  const webPageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'en',
    datePublished: '2026-08-10', dateModified,
    isPartOf: { '@type': 'WebSite', name: 'rushabhshah.dev', url: `${SITE}/` },
    author: { '@id': `${SITE}/#person` }, publisher: { '@id': `${SITE}/#person` },
  };
  // priceValidUntil rolls forward automatically — the daily rebuild cron
  // (.github/workflows/publish-blog.yml) recomputes it every run, so it's
  // always ~60 days out without needing a manual per-cert update.
  const priceValidUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const offerJsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: c.isBundle ? c.fullName : `${c.fullName} (${c.name}) Certification Exam`,
    description: c.why,
    image: `${SITE}/assets/og-lf-coupon.jpg`,
    brand: { '@type': 'Organization', name: 'The Linux Foundation' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: String(c.priceDiscounted),
      priceValidUntil,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'The Linux Foundation' },
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script>(function(){try{var p=localStorage.getItem('theme');if(p!=='light'&&p!=='dark')p='system';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var h=document.documentElement;h.dataset.theme=r;h.dataset.pref=p;h.style.colorScheme=r;}catch(e){}})();</script>
    <script defer src="/assets/theme.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#010409">
    <meta name="color-scheme" content="dark light">

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${AUTHOR}">
    <link rel="canonical" href="${url}">

    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23010409'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-size='38' font-weight='700' fill='%2358a6ff'%3ER%3C/text%3E%3C/svg%3E">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE}/assets/og-lf-coupon.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SITE}/assets/og-lf-coupon.jpg">

    <link rel="preconnect" href="https://gc.zgo.at" crossorigin>
    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/fira-code-var.woff2" as="font" type="font/woff2" crossorigin>
    <style data-inline-css>${cssMin}</style>
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>

    <script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(webPageJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(offerJsonLd)}</script>
</head>
<body>${certHeader}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
            <header class="mb-10">
                <p class="font-fira text-sm mb-6"><a href="/linux-foundation-coupon/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../linux-foundation-coupon</a></p>
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                    ${escapeHtml(c.name)} Discount Code: <span class="gradient-text">30% Off</span> with RUSHABH30
                </h1>
                <p class="font-fira text-sm text-gray-400 mb-8">Updated ${MONTH_YEAR} &middot; ${escapeHtml(c.fullName)}</p>
${saleBannerHtml()}
                <div class="flex flex-wrap items-center gap-5">
                    <span class="code-box">
                        RUSHABH30
                        <button type="button" class="chip copy-code" data-code="RUSHABH30" aria-label="Copy coupon code RUSHABH30">Copy</button>
                    </span>
                    <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-lf-${c.slug}-hero" data-goatcounter-title="LF ${c.name} hero CTA">Get ${escapeHtml(c.name)} for ~$${c.priceDiscounted} &rarr;</a>
                </div>
            </header>

            <div class="post-prose">
                <p>
                    Put <code>RUSHABH30</code> in the coupon field at checkout on
                    <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored">training.linuxfoundation.org</a>
                    and the ${escapeHtml(c.fullName)}${c.isBundle ? '' : ` (${escapeHtml(c.name)}) exam`} drops from $${c.priceList} to about $${c.priceDiscounted}, a saving of roughly $${savings}. It's an evergreen partner code with no expiry, issued directly to me through the official Linux Foundation Education affiliate program.
                </p>

                <h2 id="quick-facts">Quick facts</h2>
                <table>
                    <tbody>
                        <tr><td><strong>Format</strong></td><td>${escapeHtml(c.format)}</td></tr>
                        <tr><td><strong>Duration</strong></td><td>${escapeHtml(c.duration)}</td></tr>
                        <tr><td><strong>List price</strong></td><td>$${c.priceList}</td></tr>
                        <tr><td><strong>With RUSHABH30</strong></td><td>~$${c.priceDiscounted}</td></tr>
                        <tr><td><strong>Prerequisite</strong></td><td>${c.prerequisite ? escapeHtml(c.prerequisite) : 'None'}</td></tr>
                    </tbody>
                </table>

                <h2 id="who-its-for">Who this is for</h2>
                <p>${escapeHtml(c.audience)}</p>

                <h2 id="what-it-covers">What it covers</h2>
                <ul>
                    ${c.topics.map(t => `<li>${escapeHtml(t)}</li>`).join('\n                    ')}
                </ul>
                <p><em>Domain names above reflect the current official curriculum's topic areas; exact weightings are set by the Linux Foundation/CNCF and revised periodically, so check their published curriculum for the current breakdown.</em></p>

                <h2 id="why-it-matters">Why it's worth it</h2>
                <p>${c.why}</p>

                <h2 id="prep-tips">Prep tips</h2>
                <ul>
                    ${c.prepTips.map(t => `<li>${escapeHtml(t)}</li>`).join('\n                    ')}
                </ul>

                <h2 id="how-to-use">How to use the code</h2>
                <ol>
                    <li>Add the ${escapeHtml(c.name)}${c.isBundle ? ' bundle' : ' exam'} to your cart on <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored">training.linuxfoundation.org</a>.</li>
                    <li>Enter <code>RUSHABH30</code> in the coupon field at checkout.</li>
                    <li>The total drops 30%. RUSHABH30 works on ${c.retakeNote}.</li>
                </ol>
            </div>

            <div class="tech-card p-5 rounded-md mt-8 flex flex-wrap items-center justify-between gap-4">
                <span class="code-box">
                    RUSHABH30
                    <button type="button" class="chip copy-code" data-code="RUSHABH30" aria-label="Copy coupon code RUSHABH30">Copy</button>
                </span>
                <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-lf-${c.slug}-footer" data-goatcounter-title="LF ${c.name} footer CTA">Apply it at checkout &rarr;</a>
            </div>

            <div class="post-prose mt-8">
                <h2 id="faq">Frequently asked questions</h2>
            </div>
            <div class="faq mt-5">
                ${c.faqs.map(f => `<details>
                    <summary>${escapeHtml(f.q)}</summary>
                    <div>${escapeHtml(f.a)}</div>
                </details>`).join('\n                ')}
            </div>

${signupLF()}

            <div class="post-prose mt-8">
                <h2 id="other-certs">Other Linux Foundation &amp; CNCF certifications</h2>
                <p>RUSHABH30 works on every Linux Foundation and CNCF course and certification, not just ${escapeHtml(c.name)}. Dedicated discount guides:</p>
                <ul>
                    ${siblings.filter(s => s.slug !== c.slug).map(s => `<li><a href="/linux-foundation-coupon/${s.slug}/">${escapeHtml(s.name)} discount code</a></li>`).join('\n                    ')}
                </ul>
                <p>Or see the <a href="/linux-foundation-coupon/">full Linux Foundation coupon overview</a> for pricing across the whole catalog, including ICA, CCA, CGOA, and CAPA.</p>
                <p>Buying FinOps certifications too? Both partner codes are compared side by side on the <a href="/coupons/">certification discount codes hub</a>.</p>
            </div>

            <aside class="tech-card p-5 rounded-md mt-8">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># Affiliate disclosure</p>
                <p class="text-gray-400 text-sm leading-relaxed">
                    I'm an official Linux Foundation Education affiliate partner. If you buy through the links on this
                    page or use code <strong class="text-white">RUSHABH30</strong>, I may earn a commission, at no
                    extra cost to you (you save 30% either way).
                </p>
            </aside>
        </article>
    </main>${certFooter}
</body>
</html>
`;
}

const certLiveSlugs = new Set(CERT_PAGES.map(c => c.slug));
const certOutDir = path.join(ROOT, 'linux-foundation-coupon');
if (fs.existsSync(certOutDir)) {
  for (const entry of fs.readdirSync(certOutDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !certLiveSlugs.has(entry.name)) {
      fs.rmSync(path.join(certOutDir, entry.name), { recursive: true });
      console.log(`🗑  pruned    /linux-foundation-coupon/${entry.name}/`);
    }
  }
}
for (const c of CERT_PAGES) {
  const html = certPageHtml(c, CERT_PAGES);
  const dir = path.join(certOutDir, c.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  const md = htmlFragmentToMarkdown(extractMirrorRegion(html));
  fs.writeFileSync(path.join(dir, 'index.html.md'), md);
}
console.log(`✅ built     /linux-foundation-coupon/{${CERT_PAGES.map(c => c.slug).join(',')}}/`);

/* ---------- FinOps Foundation discount pages ----------
   Same generated-from-data approach as the Linux Foundation pages above, kept
   as a separate family on purpose. Two different partner programmes, two
   different codes, two different catalogs: sharing a template would make it far
   too easy for a 30%-off claim to leak onto a page where the code takes 20%.
   The shared pieces are the chrome (head, header, footer), not the copy. */

const finopsHead = ({ title, description, url, ogImage = `${SITE}/assets/og-finops-coupon.jpg`, jsonLd = [] }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script>(function(){try{var p=localStorage.getItem('theme');if(p!=='light'&&p!=='dark')p='system';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var h=document.documentElement;h.dataset.theme=r;h.dataset.pref=p;h.style.colorScheme=r;}catch(e){}})();</script>
    <script defer src="/assets/theme.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#010409">
    <meta name="color-scheme" content="dark light">

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${AUTHOR}">
    <link rel="canonical" href="${url}">

    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23010409'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-size='38' font-weight='700' fill='%2358a6ff'%3ER%3C/text%3E%3C/svg%3E">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImage}">

    <link rel="preconnect" href="https://gc.zgo.at" crossorigin>
    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/fira-code-var.woff2" as="font" type="font/woff2" crossorigin>
    <style data-inline-css>${cssMin}</style>
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>

${jsonLd.map(j => `    <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>`;

const finopsCodeBox = () => `<span class="code-box">
                        ${FINOPS_CODE}
                        <button type="button" class="chip copy-code" data-code="${FINOPS_CODE}" aria-label="Copy promo code ${FINOPS_CODE}">Copy</button>
                    </span>`;

/* Repeated verbatim on all six pages: the affiliate relationship, and the fact
   that the code covers five specific offerings rather than the whole catalog.
   Being explicit about what is NOT covered is the part that stops this reading
   as an inflated claim, and it is the part most coupon pages leave out. */
const finopsDisclosure = () => `            <aside class="tech-card p-5 rounded-md mt-8">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># Affiliate disclosure</p>
                <p class="text-gray-400 text-sm leading-relaxed">
                    I'm a FinOps Foundation promotional partner. If you enrol using code
                    <strong class="text-white">${FINOPS_CODE}</strong> I earn a commission, at no extra cost to you
                    (you save ${FINOPS_PCT}% either way). The code covers the five self-paced offerings listed on this
                    site and not the rest of the FinOps catalog, so I've said plainly on every page which is which
                    rather than implying it works on everything. This is a separate programme from my Linux Foundation
                    partnership, and the two run on different checkouts: <a href="/linux-foundation-coupon/">RUSHABH30</a>
                    applies at training.linuxfoundation.org, ${FINOPS_CODE} applies at learn.finops.org, and neither
                    is accepted by the other.
                </p>
            </aside>`;

function finopsPageHtml(f, siblings) {
  const url = `${SITE}/finops-coupon/${f.slug}/`;
  const price = finopsPrice(f.priceList);
  const savings = f.priceList - price;
  const title = `${f.fullName} Discount Code (${MONTH_YEAR}): ${FINOPS_PCT}% Off with ${FINOPS_CODE} · ${AUTHOR}`;
  const description = `Code ${FINOPS_CODE} takes ${FINOPS_PCT}% off the ${f.fullName} ${f.offering}: about $${price} instead of $${f.priceList}. Official FinOps Foundation partner code.`;
  const dateModified = gitLastMod(`finops-coupon/${f.slug}/index.html`) || now.toISOString().slice(0, 10);
  const priceValidUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: f.faqs.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'FinOps Coupon', item: `${SITE}/finops-coupon/` },
        { '@type': 'ListItem', position: 3, name: `${f.fullName} Discount`, item: url },
      ] },
    { '@context': 'https://schema.org', '@type': 'WebPage',
      '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'en',
      datePublished: '2026-08-26', dateModified,
      isPartOf: { '@type': 'WebSite', name: 'rushabhshah.dev', url: `${SITE}/` },
      author: { '@id': `${SITE}/#person` }, publisher: { '@id': `${SITE}/#person` } },
    { '@context': 'https://schema.org', '@type': 'Product',
      name: `${f.fullName}: ${f.offering}`,
      description: f.why,
      image: `${SITE}/assets/og-finops-coupon.jpg`,
      brand: { '@type': 'Organization', name: 'FinOps Foundation' },
      offers: { '@type': 'Offer', url, priceCurrency: 'USD', price: String(price), priceValidUntil,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'FinOps Foundation' } } },
  ];

  return `${finopsHead({ title, description, url, jsonLd })}
<body>${finopsHeader}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
            <header class="mb-10">
                <p class="font-fira text-sm mb-6"><a href="/finops-coupon/" class="text-gray-400 hover:text-primary-color"><span class="text-green-color">$</span> cd ../finops-coupon</a></p>
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                    ${escapeHtml(f.fullName)} Discount Code: <span class="gradient-text">${FINOPS_PCT}% Off</span> with ${FINOPS_CODE}
                </h1>
                <p class="font-fira text-sm text-gray-400 mb-8">Updated ${MONTH_YEAR} &middot; ${escapeHtml(f.offering)}</p>
                <div class="flex flex-wrap items-center gap-5">
                    ${finopsCodeBox()}
                    <a href="${f.dest}" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-finops-${f.slug}-hero" data-goatcounter-title="FinOps ${f.name} hero CTA">Get it for ~$${price} &rarr;</a>
                </div>
            </header>

            <div class="post-prose">
                <p>
                    Enter <code>${FINOPS_CODE}</code> at checkout on
                    <a href="${f.dest}" target="_blank" rel="noopener sponsored">learn.finops.org</a>
                    and the ${escapeHtml(f.fullName)} ${escapeHtml(f.offering)} drops from $${f.priceList} to about
                    $${price}, a saving of roughly $${savings}. It's a partner code issued to me directly by the FinOps
                    Foundation, and it applies to five specific self-paced offerings rather than the whole catalog.
                </p>

                <h2 id="quick-facts">Quick facts</h2>
                <table>
                    <tbody>
                        <tr><td><strong>Offering</strong></td><td>${escapeHtml(f.offering)}</td></tr>
                        <tr><td><strong>Format</strong></td><td>${escapeHtml(f.format)}</td></tr>
                        <tr><td><strong>Time to complete</strong></td><td>${escapeHtml(f.duration)}</td></tr>
                        <tr><td><strong>List price</strong></td><td>$${f.priceList}</td></tr>
                        <tr><td><strong>With ${FINOPS_CODE}</strong></td><td>~$${price}</td></tr>
                        <tr><td><strong>Certification valid for</strong></td><td>${escapeHtml(f.validity)}</td></tr>
                        <tr><td><strong>Prerequisite</strong></td><td>${f.prerequisite ? escapeHtml(f.prerequisite) : 'None'}</td></tr>
                    </tbody>
                </table>
                <p><em>List price read from the FinOps Foundation's own catalog in ${MONTH_YEAR}. They set the prices and can revise them, so check <a href="${f.dest}" target="_blank" rel="noopener sponsored">the product page</a> for the current number before you buy.</em></p>

                <h2 id="who-its-for">Who this is for</h2>
                <p>${escapeHtml(f.audience)}</p>

                <h2 id="what-it-covers">What it covers</h2>
                <ul>
                    ${f.topics.map(t => `<li>${escapeHtml(t)}</li>`).join('\n                    ')}
                </ul>

                <h2 id="why-it-matters">Why it's worth it</h2>
                <p>${escapeHtml(f.why)}</p>

                <h2 id="prep-tips">Prep tips</h2>
                <ul>
                    ${f.prepTips.map(t => `<li>${escapeHtml(t)}</li>`).join('\n                    ')}
                </ul>

                <h2 id="how-to-use">How to use the code</h2>
                <ol>
                    <li>Open the <a href="${f.dest}" target="_blank" rel="noopener sponsored">${escapeHtml(f.fullName)} page</a> on learn.finops.org and choose the ${escapeHtml(f.offering)} option.</li>
                    <li>Enter <code>${FINOPS_CODE}</code> in the promo code field and apply it before paying.</li>
                    <li>Check the total actually dropped by ${FINOPS_PCT}%. If it didn't, you've probably selected an exam-only, bundle, or subscription SKU, which this code doesn't cover.</li>
                </ol>
            </div>

            <div class="tech-card p-5 rounded-md mt-8 flex flex-wrap items-center justify-between gap-4">
                ${finopsCodeBox()}
                <a href="${f.dest}" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-finops-${f.slug}-footer" data-goatcounter-title="FinOps ${f.name} footer CTA">Apply it at checkout &rarr;</a>
            </div>

            <div class="post-prose mt-8">
                <h2 id="faq">Frequently asked questions</h2>
            </div>
            <div class="faq mt-5">
                ${f.faqs.map(q => `<details>
                    <summary>${escapeHtml(q.q)}</summary>
                    <div>${escapeHtml(q.a)}</div>
                </details>`).join('\n                ')}
            </div>

${signupFinOps()}

            <div class="post-prose mt-8">
                <h2 id="other-finops">The other FinOps certifications this code covers</h2>
                <p>${FINOPS_CODE} takes ${FINOPS_PCT}% off five FinOps Foundation offerings. Dedicated guides for the rest:</p>
                <ul>
                    ${siblings.filter(s => s.slug !== f.slug).map(s => `<li><a href="/finops-coupon/${s.slug}/">${escapeHtml(s.fullName)} discount code</a>: $${s.priceList}, about $${finopsPrice(s.priceList)} with the code</li>`).join('\n                    ')}
                </ul>
                <p>Or see the <a href="/finops-coupon/">full FinOps coupon overview</a> for all five side by side and advice on which to take first.</p>
                <p>Doing Kubernetes or CNCF certifications too? Those are a different checkout and a different code: <a href="/linux-foundation-coupon/">RUSHABH30 takes 30% off the Linux Foundation catalog</a> at training.linuxfoundation.org.</p>
                <p>Both codes side by side, and which one applies to what: <a href="/coupons/">certification discount codes hub</a>.</p>
            </div>

${finopsDisclosure()}
        </article>
    </main>${certFooter}
</body>
</html>
`;
}

function finopsIndexHtml(pages) {
  const url = `${SITE}/finops-coupon/`;
  const title = `FinOps Certification Discount Code (${MONTH_YEAR}): ${FINOPS_PCT}% Off with ${FINOPS_CODE} · ${AUTHOR}`;
  const description = `Official FinOps Foundation partner code ${FINOPS_CODE} takes ${FINOPS_PCT}% off FinOps Certified Practitioner, Engineer, FOCUS Analyst, AI Value, and Technology Value. Prices, comparison, and which one to take first.`;
  const dateModified = gitLastMod('finops-coupon/index.html') || now.toISOString().slice(0, 10);
  const cheapest = pages.reduce((a, b) => (b.priceList < a.priceList ? b : a));

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: `Is ${FINOPS_CODE} a real FinOps Foundation discount code?`, acceptedAnswer: { '@type': 'Answer', text: `Yes. It's a promo code issued to me directly by the FinOps Foundation as a promotional partner. It isn't scraped or recycled from a coupon aggregator, and it's honoured at checkout on learn.finops.org.` } },
        { '@type': 'Question', name: 'Which FinOps offerings does the code work on?', acceptedAnswer: { '@type': 'Answer', text: `Five: FinOps Certified Practitioner, FinOps Certified Engineer, FinOps Certified FOCUS Analyst, FinOps Certified: AI Value, and FinOps Certified: Technology Value, each as the Self-Paced Course + Certification Exam offering. It does not cover FinOps Certified Professional, the multi-certification bundles, FinOps for Containers, exam-only or recertification purchases, or corporate training subscriptions.` } },
        { '@type': 'Question', name: 'How much does FinOps certification cost with a discount code?', acceptedAnswer: { '@type': 'Answer', text: `The four $500 offerings come to about $400 each with ${FINOPS_CODE}, and the FOCUS Analyst certification comes from $400 to about $320. That's ${FINOPS_PCT}% off, saving $80 to $100 per certification.` } },
        { '@type': 'Question', name: 'Which FinOps certification should I take first?', acceptedAnswer: { '@type': 'Answer', text: 'FinOps Certified Practitioner for almost everyone, because it establishes the framework and vocabulary the others assume. Engineers who own infrastructure can reasonably start with FinOps Certified Engineer instead, and anyone who mainly builds cost data pipelines can start with FOCUS Analyst, which stands on its own.' } },
        { '@type': 'Question', name: 'Does the code expire?', acceptedAnswer: { '@type': 'Answer', text: 'No end date was set when the FinOps Foundation issued it. This page is rebuilt daily, so if the code ever stops being honoured it gets corrected here rather than left up.' } },
        { '@type': 'Question', name: 'Can I combine it with other FinOps discounts?', acceptedAnswer: { '@type': 'Answer', text: 'No. Promo codes on learn.finops.org do not stack. Use whichever single discount is larger.' } },
      ] },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'FinOps Coupon', item: url },
      ] },
    { '@context': 'https://schema.org', '@type': 'WebPage',
      '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'en',
      datePublished: '2026-08-26', dateModified,
      isPartOf: { '@type': 'WebSite', name: 'rushabhshah.dev', url: `${SITE}/` },
      author: { '@id': `${SITE}/#person` }, publisher: { '@id': `${SITE}/#person` } },
  ];

  return `${finopsHead({ title, description, url, jsonLd })}
<body>${finopsHeader}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
            <header class="mb-10">
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                    FinOps Certification Coupon: <span class="gradient-text">${FINOPS_PCT}% Off</span> with ${FINOPS_CODE}
                </h1>
                <p class="font-fira text-sm text-gray-400 mb-8">
                    Updated ${MONTH_YEAR} &middot; Works on FinOps Certified Practitioner, Engineer, FOCUS Analyst, AI Value &amp; Technology Value
                </p>
                <div class="flex flex-wrap items-center gap-5">
                    ${finopsCodeBox()}
                    <a href="https://learn.finops.org/" target="_blank" rel="noopener sponsored" class="btn btn-ghost">Open the FinOps catalog &rarr;</a>
                </div>
                <p class="font-fira text-xs text-gray-400 mt-3">Last verified: ${MONTH_YEAR}</p>
            </header>

            <div class="post-prose">
                <p>
                    The short version: put <code>${FINOPS_CODE}</code> in the promo code field at checkout on
                    <a href="https://learn.finops.org/" target="_blank" rel="noopener sponsored">learn.finops.org</a>
                    and the total drops ${FINOPS_PCT}%. It works on five self-paced FinOps Foundation certifications,
                    listed below with the maths already done. The rest of this page is context: where the code comes
                    from, what each certification is actually for, and which one I'd tell you to take first.
                </p>

                <h2 id="where-from">Where this code comes from</h2>
                <p>
                    I'm <a href="/">Rushabh Shah</a>, a DevOps engineer in Ahmedabad, a Docker Captain, and a Grafana
                    Champion. Cloud cost is not a side interest for me: I drove a 59% AWS spend reduction at Genuin,
                    led a zero-downtime AWS to Oracle Cloud migration under a hard deadline, and cost optimization is
                    part of my day job now. That work is why the FinOps Foundation set up
                    <code>${FINOPS_CODE}</code> as a partner code for my community.
                </p>
                <p>
                    The reason I care about the discount specifically is the same reason I pushed for the Linux
                    Foundation one: a $500 certification is a serious decision on an Indian salary, and the people who
                    would benefit most from FinOps training are usually the ones who cannot expense it. ${FINOPS_PCT}%
                    is not life-changing, but it is real, and the code is honoured by the FinOps Foundation directly
                    rather than being a recycled aggregator coupon that stopped working two quarters ago.
                </p>

                <h2 id="prices">What each one costs with the code</h2>
                <p>All five are the Self-Paced Course + Certification Exam offering, which bundles the course and the exam together and includes 12 months of access to the material:</p>
                <table>
                    <thead>
                        <tr><th>Certification</th><th>Best for</th><th>List price*</th><th>With ${FINOPS_CODE}</th></tr>
                    </thead>
                    <tbody>
                        ${pages.map(f => `<tr><td><strong><a href="/finops-coupon/${f.slug}/">${escapeHtml(f.fullName)}</a></strong></td><td>${escapeHtml(f.shortFor)}</td><td>$${f.priceList}</td><td>~$${finopsPrice(f.priceList)}</td></tr>`).join('\n                        ')}
                    </tbody>
                </table>
                <p><em>*List prices read from the FinOps Foundation's own catalog in ${MONTH_YEAR}. They set the prices and revise them periodically, so check <a href="https://learn.finops.org/" target="_blank" rel="noopener sponsored">learn.finops.org</a> for current numbers.</em></p>

                <h2 id="not-covered">What the code does not cover</h2>
                <p>
                    Worth stating plainly, because most coupon pages imply a code works on everything. The FinOps
                    Foundation approved five offerings for this code. These are <strong>not</strong> included:
                </p>
                <ul>
                    <li>FinOps Certified Professional, the advanced certification</li>
                    <li>The multi-certification bundles, such as Practitioner + FOCUS Analyst or the Full Catalog plan</li>
                    <li>FinOps for Containers</li>
                    <li>Exam-only and recertification purchases</li>
                    <li>Corporate training subscriptions</li>
                </ul>
                <p>
                    If you're weighing a bundle against buying two certifications separately with the code, do the
                    arithmetic both ways. Sometimes the bundle still wins, and I'd rather you saved the money than
                    used my code.
                </p>

                <h2 id="which-first">Which FinOps certification should you take first?</h2>
                <p>
                    <strong>Almost everyone should start with the <a href="/finops-coupon/practitioner/">FinOps
                    Certified Practitioner</a>.</strong> It is the one job descriptions name, and more usefully it is
                    the one that gives you and your finance team a shared vocabulary. The other four assume you already
                    have it.
                </p>
                <p>Two reasonable exceptions:</p>
                <ul>
                    <li>If you build and run the infrastructure and want cost folded into engineering decisions rather than reported after the fact, <a href="/finops-coupon/engineer/">FinOps Certified Engineer</a> is the better fit and reads as the more relevant credential on an engineering CV.</li>
                    <li>If your actual job is billing data pipelines and cost reporting, <a href="/finops-coupon/focus-analyst/">FinOps Certified FOCUS Analyst</a> stands on its own, and at $${cheapest.priceList} it is the cheapest way into the catalog.</li>
                </ul>
                <p>
                    <a href="/finops-coupon/ai-value/">AI Value</a> and
                    <a href="/finops-coupon/technology-value/">Technology Value</a> are both extensions of an existing
                    practice rather than entry points. Take them when the question they answer is one your leadership
                    is actually asking: AI Value when AI spend has become material and nobody can explain it, Technology
                    Value when the remit has grown past public cloud into SaaS, data centres, and data platforms.
                </p>

                <h2 id="per-cert">Guides for each certification</h2>
                <p>Each one has its own page with pricing, format, what it covers, prep advice, and an FAQ:</p>
                <ul>
                    ${pages.map(f => `<li><a href="/finops-coupon/${f.slug}/">${escapeHtml(f.fullName)} discount code</a>: $${f.priceList}, about $${finopsPrice(f.priceList)} with ${FINOPS_CODE}</li>`).join('\n                    ')}
                </ul>

                <h2 id="how-to-use">How to use the code</h2>
                <ol>
                    <li>Open the certification you want on <a href="https://learn.finops.org/" target="_blank" rel="noopener sponsored">learn.finops.org</a> and pick the Self-Paced Course + Certification Exam option.</li>
                    <li>Enter <code>${FINOPS_CODE}</code> in the promo code field and apply it before paying.</li>
                    <li>Confirm the total dropped by ${FINOPS_PCT}%. If nothing happens, you've selected a SKU the code doesn't cover, most likely an exam-only, bundle, or subscription option.</li>
                </ol>
            </div>

            <div class="tech-card p-5 rounded-md mt-8 flex flex-wrap items-center justify-between gap-4">
                ${finopsCodeBox()}
                <a href="https://learn.finops.org/" target="_blank" rel="noopener sponsored" class="btn btn-primary" data-goatcounter-click="cta-finops-overview" data-goatcounter-title="FinOps overview CTA">Apply it at checkout &rarr;</a>
            </div>

            <div class="post-prose mt-8">
                <h2 id="faq">Frequently asked questions</h2>
            </div>
            <div class="faq mt-5">
                <details>
                    <summary>Is ${FINOPS_CODE} legit?</summary>
                    <div>Yes. It's a promo code issued to me directly by the FinOps Foundation as a promotional partner. It isn't scraped or recycled from a coupon aggregator, and it's honoured at checkout on learn.finops.org.</div>
                </details>
                <details>
                    <summary>Which FinOps offerings does it work on?</summary>
                    <div>Five: FinOps Certified Practitioner, FinOps Certified Engineer, FinOps Certified FOCUS Analyst, FinOps Certified: AI Value, and FinOps Certified: Technology Value, each as the Self-Paced Course + Certification Exam offering. Not FinOps Certified Professional, the bundles, FinOps for Containers, exam-only or recertification purchases, or corporate subscriptions.</div>
                </details>
                <details>
                    <summary>How much does FinOps certification cost with the code?</summary>
                    <div>The four $500 offerings come to about $400 each, and the FOCUS Analyst certification goes from $400 to about $320. That's ${FINOPS_PCT}% off, so $80 to $100 saved per certification.</div>
                </details>
                <details>
                    <summary>Does it stack with other discounts?</summary>
                    <div>No. Promo codes on learn.finops.org don't combine. Use whichever single discount is larger.</div>
                </details>
                <details>
                    <summary>Does the code expire?</summary>
                    <div>No end date was set when it was issued. This page rebuilds daily, so if the code ever stops working it gets corrected here rather than left up as a dead coupon.</div>
                </details>
                <details>
                    <summary>Does RUSHABH30 work on these FinOps certifications?</summary>
                    <div>Not on learn.finops.org, which is where these five certifications are sold. They're two separate partner programmes on two separate checkouts: RUSHABH30 applies at training.linuxfoundation.org and ${FINOPS_CODE} applies at learn.finops.org. Use <a href="/linux-foundation-coupon/">RUSHABH30</a> for CKA, CKAD, CKS, KCNA and the rest of the CNCF catalog, and ${FINOPS_CODE} here.</div>
                </details>
                <details>
                    <summary>Is FinOps certification worth it at all?</summary>
                    <div>It depends what you want from it. It won't teach an experienced engineer new ways to cut a bill. What it gives you is a framework and a shared language for defending cost decisions to finance and leadership, which is usually the harder half of the work, plus a credential that's increasingly named in cloud cost job descriptions.</div>
                </details>
            </div>

${signupFinOps()}

${finopsDisclosure()}
        </article>
    </main>${certFooter}
</body>
</html>
`;
}

/* ---------- write the FinOps pages ---------- */

const finopsLiveSlugs = new Set(FINOPS_PAGES.map(f => f.slug));
const finopsOutDir = path.join(ROOT, 'finops-coupon');
if (fs.existsSync(finopsOutDir)) {
  for (const entry of fs.readdirSync(finopsOutDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !finopsLiveSlugs.has(entry.name)) {
      fs.rmSync(path.join(finopsOutDir, entry.name), { recursive: true });
      console.log(`🗑  pruned    /finops-coupon/${entry.name}/`);
    }
  }
}
fs.mkdirSync(finopsOutDir, { recursive: true });
{
  const html = finopsIndexHtml(FINOPS_PAGES);
  fs.writeFileSync(path.join(finopsOutDir, 'index.html'), html);
  fs.writeFileSync(path.join(finopsOutDir, 'index.html.md'), htmlFragmentToMarkdown(extractMirrorRegion(html)));
}
for (const f of FINOPS_PAGES) {
  const html = finopsPageHtml(f, FINOPS_PAGES);
  const dir = path.join(finopsOutDir, f.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'index.html.md'), htmlFragmentToMarkdown(extractMirrorRegion(html)));
}
console.log(`✅ built     /finops-coupon/ + {${FINOPS_PAGES.map(f => f.slug).join(',')}}/`);

/* ---------- /coupons/ — the hub above both partner programmes ----------
   Deliberately comparative and navigational rather than a third copy of the
   pricing tables. The two section pages already rank for their own catalogs;
   what neither can do is answer "I want a DevOps certification, which of these
   two codes do I even need?", which is the query this page exists for.

   Keeping it here rather than on a separate coupon domain is a considered
   call: these pages convert on E-E-A-T (named partner, verifiable track
   record, real per-exam guidance) and a standalone coupon site throws exactly
   that away while starting from zero authority. The hub gives the section room
   to grow to a third programme without needing a new domain. */

function couponsHubHtml() {
  const url = `${SITE}/coupons/`;
  const title = `Certification Discount Codes (${MONTH_YEAR}): 30% Off Linux Foundation, ${FINOPS_PCT}% Off FinOps · ${AUTHOR}`;
  const description = `Two official partner codes: RUSHABH30 for 30% off every Linux Foundation and CNCF certification, ${FINOPS_CODE} for ${FINOPS_PCT}% off FinOps Foundation certifications. Which one you need, and what each covers.`;
  const dateModified = gitLastMod('coupons/index.html') || now.toISOString().slice(0, 10);
  const cheapestLF = CERT_PAGES.reduce((a, b) => (b.priceDiscounted < a.priceDiscounted ? b : a));
  const cheapestFin = FINOPS_PAGES.reduce((a, b) => (b.priceList < a.priceList ? b : a));

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Certification discount codes', item: url },
      ] },
    { '@context': 'https://schema.org', '@type': 'WebPage',
      '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'en',
      datePublished: '2026-08-26', dateModified,
      isPartOf: { '@type': 'WebSite', name: 'rushabhshah.dev', url: `${SITE}/` },
      author: { '@id': `${SITE}/#person` }, publisher: { '@id': `${SITE}/#person` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Which discount code do I need?', acceptedAnswer: { '@type': 'Answer', text: `RUSHABH30 for anything bought on training.linuxfoundation.org, which is every Linux Foundation and CNCF certification including CKA, CKAD, CKS, KCNA and the Kubestronaut bundles. ${FINOPS_CODE} for the five FinOps Foundation certifications bought on learn.finops.org. The two checkouts don't accept each other's codes.` } },
        { '@type': 'Question', name: 'Are these real partner codes?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Both were issued to me directly by the organisations that run the certifications, as an affiliate or promotional partner. Neither is scraped or recycled from a coupon aggregator, and both are honoured at the official checkout.' } },
        { '@type': 'Question', name: 'Do the codes expire?', acceptedAnswer: { '@type': 'Answer', text: 'Neither has an end date. These pages rebuild daily, so if a code ever stops being honoured it gets corrected here rather than left up as a dead coupon.' } },
        { '@type': 'Question', name: 'What if there is a bigger sale running?', acceptedAnswer: { '@type': 'Answer', text: "Take the sale. Official sales beat both partner codes a few times a year and the codes never stack with them, so the rule is always to use the single biggest discount available at that moment. When a sale is live it's shown at the top of the relevant page here." } },
      ] },
  ];

  const saleNote = saleLive
    ? `<p class="text-gray-400 text-sm leading-relaxed mb-6"><strong class="text-white">Right now there's a Linux Foundation sale running</strong> that beats RUSHABH30 (${SALE.courses.pct}% off with <code>${SALE.courses.code}</code>, ${SALE.bundles.pct}% off bundles with <code>${SALE.bundles.code}</code>, ends ${escapeHtml(SALE.advertisedEnd)}). Details on the <a href="/linux-foundation-coupon/">Linux Foundation page</a>.</p>`
    : '';

  return `${finopsHead({ title, description, url, ogImage: `${SITE}/assets/og-coupons.jpg`, jsonLd })}
<body>${dealsHeader('/coupons/')}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
            <header class="mb-10">
                <h1 class="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                    Certification Discount Codes That <span class="gradient-text">Actually Work</span>
                </h1>
                <p class="font-fira text-sm text-gray-400 mb-8">Updated ${MONTH_YEAR} &middot; Two official partner codes, one page</p>
                ${saleNote}
                <div class="flex flex-wrap items-center gap-5">
                    <span class="code-box">
                        RUSHABH30
                        <button type="button" class="chip copy-code" data-code="RUSHABH30" aria-label="Copy coupon code RUSHABH30">Copy</button>
                    </span>
                    ${finopsCodeBox()}
                </div>
            </header>

            <div class="post-prose">
                <p>
                    I hold two training partnerships, and they cover completely different catalogs on completely
                    different checkouts. That trips people up, so this page exists to answer one question: which code
                    do you need? Once you know, the linked page has the pricing, the exam formats, and the prep advice.
                </p>

                <h2 id="which-code">Which code do you need?</h2>
                <table>
                    <thead>
                        <tr><th>If you're buying</th><th>Use</th><th>You save</th><th>Where</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Any Linux Foundation or CNCF certification, course or bundle: CKA, CKAD, CKS, KCNA, KCSA, LFCS, LFCA, PCA, OTCA, ICA, CCA, CGOA, CAPA, Kubestronaut</td>
                            <td><code>RUSHABH30</code></td>
                            <td>30%</td>
                            <td>training.linuxfoundation.org</td>
                        </tr>
                        <tr>
                            <td>A FinOps Foundation certification: Practitioner, Engineer, FOCUS Analyst, AI Value, Technology Value</td>
                            <td><code>${FINOPS_CODE}</code></td>
                            <td>${FINOPS_PCT}%</td>
                            <td>learn.finops.org</td>
                        </tr>
                    </tbody>
                </table>
                <p>
                    They are not interchangeable. Each checkout rejects the other's code, which is the single most
                    common thing people email me about.
                </p>

                <h2 id="lf">Linux Foundation &amp; CNCF: 30% off with RUSHABH30</h2>
                <p>
                    This is the big catalog: every Kubernetes certification, the CNCF associate exams, LFCS and LFCA,
                    the self-paced courses, and the Kubestronaut and Golden Kubestronaut bundles. The code is evergreen
                    with no expiry, and it works on course + exam bundles as well as bare exams, which is usually the
                    better buy. The cheapest way in is ${escapeHtml(cheapestLF.name)} at about $${cheapestLF.priceDiscounted}.
                </p>
                <p><a href="/linux-foundation-coupon/"><strong>Full pricing across the catalog, per-exam guides and the sale archive &rarr;</strong></a></p>

                <h2 id="finops">FinOps Foundation: ${FINOPS_PCT}% off with ${FINOPS_CODE}</h2>
                <p>
                    A separate programme covering five self-paced FinOps certifications. Worth knowing up front: this
                    code covers those five specifically and not FinOps Certified Professional, the multi-certification
                    bundles, exam-only purchases, or corporate subscriptions. The cheapest is the
                    ${escapeHtml(cheapestFin.fullName)} at about $${finopsPrice(cheapestFin.priceList)}.
                </p>
                <p><a href="/finops-coupon/"><strong>All five certifications, what the code excludes, and which to take first &rarr;</strong></a></p>

                <h2 id="which-cert">Not sure which certification, never mind which code?</h2>
                <p>The short version of advice I give at meetups:</p>
                <ul>
                    <li><strong>You run Kubernetes in production.</strong> <a href="/linux-foundation-coupon/cka/">CKA</a>. It's the one hiring managers actually check for, and it's a live-terminal exam so it proves you can do the job rather than describe it.</li>
                    <li><strong>You ship apps onto Kubernetes but don't run the cluster.</strong> <a href="/linux-foundation-coupon/ckad/">CKAD</a>.</li>
                    <li><strong>You're new to cloud native.</strong> <a href="/linux-foundation-coupon/kcna/">KCNA</a> for the vocabulary, or <a href="/linux-foundation-coupon/lfca/">LFCA</a> if you're starting further back than that.</li>
                    <li><strong>Your job is cloud cost.</strong> <a href="/finops-coupon/practitioner/">FinOps Certified Practitioner</a>, which is the one that gives you and your finance team a shared language.</li>
                    <li><strong>You build cost data pipelines.</strong> <a href="/finops-coupon/focus-analyst/">FinOps Certified FOCUS Analyst</a>, the cheapest entry point of the five.</li>
                </ul>

                <h2 id="sales">When a sale beats both codes</h2>
                <p>
                    A few times a year the Linux Foundation runs an official sale deeper than 30%, and sale codes never
                    stack with partner codes. The rule is simple: use the single biggest discount available right now,
                    even when that isn't mine. Both organisations give me advance notice of these, which is what the
                    box below is for.
                </p>
            </div>

${signupHub()}

            <div class="post-prose mt-8">
                <h2 id="faq">Frequently asked questions</h2>
            </div>
            <div class="faq mt-5">
                <details>
                    <summary>Which discount code do I need?</summary>
                    <div>RUSHABH30 for anything on training.linuxfoundation.org, ${FINOPS_CODE} for the five FinOps certifications on learn.finops.org. Each checkout rejects the other's code.</div>
                </details>
                <details>
                    <summary>Are these real partner codes, or scraped coupons?</summary>
                    <div>Both were issued to me directly by the organisations running the certifications, as an affiliate or promotional partner. Neither is recycled from an aggregator, and both are honoured at the official checkout.</div>
                </details>
                <details>
                    <summary>Do they expire?</summary>
                    <div>Neither has an end date. These pages rebuild daily, so if a code stops being honoured it gets corrected here rather than left up as a dead coupon.</div>
                </details>
                <details>
                    <summary>What if a bigger sale is running?</summary>
                    <div>Take the sale. The codes never stack with official sales, so always use the single biggest discount available at that moment. When one is live it's shown at the top of the relevant page here.</div>
                </details>
                <details>
                    <summary>Why should I trust this over a coupon aggregator?</summary>
                    <div>You don't have to take my word for it. I'm a named person with a checkable track record (Docker Captain, Grafana Champion, a public GitHub history), every price here is checkable against the official catalog, and I tell you when a sale beats my own code rather than hiding it.</div>
                </details>
            </div>

            <aside class="tech-card p-5 rounded-md mt-8">
                <p class="font-fira text-xs uppercase tracking-wider text-gray-500 mb-3"># Affiliate disclosure</p>
                <p class="text-gray-400 text-sm leading-relaxed">
                    Both codes are partner codes and I earn a commission when someone uses one, at no extra cost to you.
                    That's also why you'll see me point at official sales that beat my own codes: the discount you get
                    doesn't depend on which is better for me.
                </p>
            </aside>
        </article>
    </main>${certFooter}
</body>
</html>
`;
}

{
  const dir = path.join(ROOT, 'coupons');
  fs.mkdirSync(dir, { recursive: true });
  const html = couponsHubHtml();
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'index.html.md'), htmlFragmentToMarkdown(extractMirrorRegion(html)));
  console.log('✅ built     /coupons/');
}

/* ---------- /go/<slug>/ — branded affiliate redirects ----------
   Competitors hand out kube.promo/... links; ours were raw
   awin1.com/cread.php?awinmid=85919&awinaffid=... URLs, which look like
   tracking spam in a README and are unusable in a talk or a slide.

   These are the same destinations behind a link on my own domain, which means:
   the URL is readable, it works anywhere I paste it, and if the affiliate
   network or the deep link ever changes I re-point one file here instead of
   editing every page and every README that quotes it.

   Deliberately noindex + excluded from the sitemap: they're plumbing, not
   content, and letting Google index a pile of thin redirect pages on a domain
   whose whole argument is "real practitioner, not an affiliate farm" would be
   the exact wrong signal. Attribution still runs through Awin's own click
   reporting, so nothing here needs to count anything itself. */

const GO_LINKS = () => {
  const map = {
    catalog: awinLink('https://training.linuxfoundation.org/'),
    sale: SALE ? awinLink(SALE.dest) : awinLink('https://training.linuxfoundation.org/'),
    finops: 'https://learn.finops.org/',
  };
  // Every cert that has a page gets a matching short link, generated from the
  // same dest the page's own CTA uses so the two can never disagree.
  for (const c of CERT_PAGES) map[c.slug] = awinLink(c.dest);
  // Certs that don't have a dedicated page here but do appear in the coupon
  // repo's pricing table, so every row there can carry a branded link.
  for (const [slug, dest] of Object.entries({
    cnpe: 'certified-cloud-native-platform-engineer-cnpe',
    ica: 'istio-certified-associate-ica',
    cca: 'cilium-certified-associate-cca',
    capa: 'certified-argo-project-associate-capa',
    cgoa: 'certified-gitops-associate-cgoa',
    cba: 'certified-backstage-associate-cba',
    kca: 'kyverno-certified-associate-kca',
    cnpa: 'certified-cloud-native-platform-engineering-associate-cnpa',
  })) map[slug] = awinLink(`https://training.linuxfoundation.org/certification/${dest}/`);
  // Multi-exam bundles. These product pages are real (verified 200) but carry
  // no machine-readable price, so they get links here and are quoted without
  // prices elsewhere rather than guessing at numbers.
  for (const [slug, dest] of Object.entries({
    'cka-cks': 'https://training.linuxfoundation.org/certification/cka-cks-exam-bundle/',
    'cka-ckad-cks': 'https://training.linuxfoundation.org/certification/cka-ckad-cks-exam-bundle/',
    'kcna-cka': 'https://training.linuxfoundation.org/certification/kcna-cka-exam-bundle/',
  })) map[slug] = awinLink(dest);
  return map;
};

{
  const links = GO_LINKS();
  const goDir = path.join(ROOT, 'go');
  const live = new Set(Object.keys(links));
  if (fs.existsSync(goDir)) {
    for (const e of fs.readdirSync(goDir, { withFileTypes: true })) {
      if (e.isDirectory() && !live.has(e.name)) {
        fs.rmSync(path.join(goDir, e.name), { recursive: true });
        console.log(`🗑  pruned    /go/${e.name}/`);
      }
    }
  }
  for (const [slug, dest] of Object.entries(links)) {
    const dir = path.join(goDir, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="0;url=${escapeHtml(dest)}">
<link rel="canonical" href="${SITE}/linux-foundation-coupon/">
<title>Redirecting&hellip;</title>
</head>
<body>
<p>Redirecting to the offer. <a href="${escapeHtml(dest)}" rel="noopener sponsored nofollow">Continue &rarr;</a></p>
<p><small>Affiliate link: I may earn a commission at no extra cost to you.</small></p>
</body>
</html>
`);
  }
  console.log(`✅ built     /go/{${Object.keys(links).join(',')}}/`);
}




/* ---------- homepage: pre-render Tech Stack, Certifications, Experience,
   Projects, and Latest Posts ----------
   These used to be built client-side from data arrays living inside
   index.html's own <script> tag (so they were empty on first paint until JS
   ran). Same data, ported here 1:1, rendered into index.html at build time
   instead. Edit the data below, not index.html — index.html's markers get
   overwritten on every build. */

const ICON_PATHS = {
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>',
  'git-branch': '<line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path>',
  award: '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
};
const homeIcon = (name, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${ICON_PATHS[name] || ''}</svg>`;

const SKILL_GROUPS = [
  { label: 'Containers & Orchestration', items: [
    { name: 'Kubernetes', si: 'kubernetes' },
    { name: 'Docker', si: 'docker' },
    { name: 'Helm', si: 'helm' },
    { name: 'Argo CD', si: 'argo' },
  ]},
  { label: 'IaC & Automation', items: [
    { name: 'Terraform', si: 'terraform' },
    { name: 'Ansible', si: 'ansible' },
    { name: 'GitHub Actions', si: 'githubactions' },
  ]},
  { label: 'Cloud Platforms', items: [
    { name: 'AWS', if: 'logos/aws' },
    { name: 'Azure', if: 'logos/microsoft-azure' },
    { name: 'GCP', if: 'logos/google-cloud' },
    { name: 'OCI', if: 'logos/oracle' },
  ]},
  { label: 'Observability', items: [
    { name: 'Prometheus', si: 'prometheus' },
    { name: 'Grafana', si: 'grafana' },
    { name: 'Loki / Tempo / Mimir', icon: 'database' },
    { name: 'OpenTelemetry', si: 'opentelemetry' },
  ]},
  { label: 'Languages & Tooling', items: [
    { name: 'Linux', si: 'linux' },
    { name: 'Bash', si: 'gnubash' },
    { name: 'Python', si: 'python' },
    { name: 'Git', si: 'git' },
    { name: 'CI/CD', icon: 'git-branch' },
  ]},
];

const CERTS = [
  { name: 'KCNA: Kubernetes and Cloud Native Associate', code: 'The Linux Foundation', icon: 'award' },
  { name: 'Microsoft Certified: Azure Administrator Associate', code: 'AZ-104', icon: 'award' },
  { name: 'Microsoft Certified: Azure Fundamentals', code: 'AZ-900', icon: 'award' },
];

const EXPERIENCE = [
  { company: 'Oro', role: 'DevOps Engineer', date: 'Jun 2025 - Present', current: true,
    desc: 'Operating Kubernetes workloads with Helm and GitOps via Argo CD; CI/CD on GitHub Actions; IaC with Terraform; observability with Prometheus, Grafana, Loki, Tempo and OpenTelemetry; cloud cost optimization and security hardening across the platform.' },
  { company: 'Koenig Solutions Pvt. Ltd.', role: 'Corporate Trainer', date: 'Jun 2025 - Jul 2025',
    desc: 'Delivered live virtual and classroom training on Azure role-based certifications (AZ-900, AZ-104, AZ-305, AZ-400) to working IT professionals and enterprise teams across regions.' },
  { company: 'Genuin', role: 'DevOps Engineer', date: 'Jan 2025 - May 2025',
    desc: 'Drove a 59% AWS cost reduction; built end-to-end CI/CD pipelines bringing release time to ~10 minutes; led a zero-downtime AWS → Oracle Cloud Infrastructure migration under a fixed deadline; implemented controls for ISO and SOC Type 1 readiness.' },
  { company: 'KodeKloud', role: 'Jr DevOps Engineer', date: 'Jul 2024 - Dec 2024',
    desc: 'Built hands-on Azure labs (AZ-900, AZ-104, AZ-204, AZ-400) and multi-cloud lab environments on AWS, Azure and GCP. Automated provisioning with Terraform, Ansible and Bash. Represented KodeKloud at KubeCon India 2024.' },
  { company: 'Tridhya Tech Limited', role: 'Jr DevOps Engineer', date: 'Jun 2023 - Jun 2024',
    desc: 'Built and maintained Docker images and Kubernetes workloads, designed CI/CD pipelines on Jenkins and GitHub Actions, provisioned infra with Terraform/Ansible across Azure and AWS. Earned AZ-900 and AZ-104; ran an internal TechTalk on Kubernetes.' },
];

const PROJECTS = [
  { title: 'eBPF.io: Hindi Translation', desc: 'Translated the eBPF.io website into Hindi so Hindi-speaking engineers can learn about eBPF for networking, observability, and security on Linux.', link: 'https://ebpf.io/hi-in/', tags: ['eBPF', 'Open Source', 'Linux', 'i18n'], src: '/assets/ebpf-logo.svg' },
  { title: 'Personal Tech Blog', desc: 'My blog, right here on rushabhshah.dev: DevOps, Kubernetes, observability, cloud cost, and Linux.', link: '/blog/', tags: ['Blog', 'Observability', 'Linux', 'DevOps'], feather: 'book-open' },
];

const renderSkillGroups = () => SKILL_GROUPS.map((group, gi) => {
  const chips = group.items.map(s => {
    let ic;
    if (s.if) {
      const fname = s.if.replace(/\//g, '-');
      ic = `<img src="/assets/icons/color/${fname}.svg" alt="${escapeHtml(s.name)} logo" loading="lazy" width="16" height="16">`;
    } else if (s.si) {
      ic = `<img class="mono-icon" src="/assets/icons/mono/${s.si}.svg" alt="${escapeHtml(s.name)} logo" loading="lazy" width="16" height="16">`;
    } else {
      ic = homeIcon(s.icon, 'w-4 h-4');
    }
    return `<span class="chip">${ic}${escapeHtml(s.name)}</span>`;
  }).join('');
  return `<div class="flex flex-col md:flex-row md:items-center gap-4 stagger" style="--i: ${gi}">
                    <div class="md:w-48 flex-shrink-0">
                        <p class="font-fira text-xs uppercase tracking-wider text-gray-500"># ${escapeHtml(group.label)}</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5 flex-1">${chips}</div>
                </div>`;
}).join('');

const renderCerts = () => CERTS.map(c => `<div class="tech-card p-5 rounded-md flex items-center gap-4">
                    ${homeIcon(c.icon, 'text-primary-color w-6 h-6 flex-shrink-0')}
                    <div>
                        <p class="text-white font-semibold text-sm">${escapeHtml(c.name)}</p>
                        <p class="text-xs font-fira text-gray-400 mt-1">${escapeHtml(c.code)}</p>
                    </div>
                </div>`).join('');

const renderExperience = () => EXPERIENCE.map((item, i) => {
  const dotClass = item.current ? 'timeline-dot timeline-dot-current' : 'timeline-dot';
  const currentBadge = item.current ? `<span class="status-pill" style="font-size:0.7rem; padding:0.15rem 0.55rem;"><span class="dot"></span>Current</span>` : '';
  return `<div class="ml-10 mb-10 tech-card p-6 rounded-md" style="--i: ${i}">
                    <div class="absolute ${dotClass}" aria-hidden="true"></div>
                    <div class="flex items-start justify-between gap-3 mb-1">
                        <h3 class="text-xl font-bold text-white">${escapeHtml(item.role)}</h3>
                        ${currentBadge}
                    </div>
                    <p class="text-primary-color mb-1">${escapeHtml(item.company)}</p>
                    <time class="text-sm font-fira text-gray-400 block mb-2">${escapeHtml(item.date)}</time>
                    ${item.desc ? `<p class="text-gray-400 text-sm leading-relaxed">${escapeHtml(item.desc)}</p>` : ''}
                </div>`;
}).join('');

const renderProjects = () => PROJECTS.map((proj, i) => {
  const tagsHtml = proj.tags.map(tag => `<span class="text-xs font-fira bg-primary-color/10 text-primary-color py-1 px-2 rounded-full">${escapeHtml(tag)}</span>`).join(' ');
  let iconHtml;
  if (proj.src) {
    iconHtml = `<img src="${proj.src}" alt="${escapeHtml(proj.title)} logo" loading="lazy" width="70" height="24" class="h-6 w-auto">`;
  } else if (proj.if) {
    iconHtml = `<img src="https://api.iconify.design/${proj.if}.svg" alt="${escapeHtml(proj.title)} logo" loading="lazy" class="w-6 h-6">`;
  } else if (proj.si) {
    iconHtml = `<img src="https://cdn.simpleicons.org/${proj.si}/58a6ff" alt="${escapeHtml(proj.title)} logo" loading="lazy" class="w-6 h-6">`;
  } else {
    iconHtml = homeIcon(proj.feather || 'folder', 'text-primary-color');
  }
  const external = !proj.link.startsWith('/');
  return `<a href="${proj.link}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="tech-card p-6 rounded-md flex flex-col group" style="--i: ${i}">
                    <div class="flex justify-between items-center mb-4">
                        ${iconHtml}
                        <div class="flex items-center gap-3">
                            ${proj.repo ? `<span class="gh-stars font-fira text-xs text-gray-400" data-repo="${escapeHtml(proj.repo)}"></span>` : ''}
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500 group-hover:text-primary-color w-4 h-4 transition-colors"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(proj.title)}</h3>
                    <p class="text-gray-400 mb-4 flex-grow text-sm leading-relaxed">${escapeHtml(proj.desc)}</p>
                    <div class="flex flex-wrap gap-2 mt-auto">
                        ${tagsHtml}
                    </div>
                </a>`;
}).join('');

const renderLatestPosts = () => {
  if (!all.length) {
    return `<a href="/blog/" class="tech-card p-6 rounded-md flex flex-col items-center justify-center text-center lg:col-span-3 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary-color w-8 h-8 mb-3"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                        <h3 class="text-lg font-bold text-white mb-1">Read the blog</h3>
                        <p class="text-gray-400 text-sm">Articles on DevOps, Kubernetes, observability, cloud cost, and Linux.</p>
                    </a>`;
  }
  return all.slice(0, 3).map(p => {
    const url = `/blog/${p.slug}/`;
    const desc = p.description || '';
    const descTrunc = escapeHtml(desc.slice(0, 140) + (desc.length > 140 ? '…' : ''));
    return `<a href="${url}" class="tech-card rounded-md flex flex-col group overflow-hidden">
                        ${cardMedia(p, 'post-card-media-top')}
                        <div class="p-5 flex flex-col flex-grow">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-xs font-fira text-gray-400">${fmtDate(p.date)} · ${p.minutes} min read</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500 group-hover:text-primary-color w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </div>
                            <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-primary-color transition-colors">${escapeHtml(p.title)}</h3>
                            <p class="text-gray-400 text-sm flex-grow">${descTrunc}</p>
                        </div>
                    </a>`;
  }).join('');
};

// Idempotent single-marker swap: finds the (unchanged, original) HTML comment
// and replaces everything from right after it up to the closing tag of its
// *own* enclosing element — found by tracking <div>/</div> nesting depth from
// the marker's position, not a second textual marker. This is what makes a
// second build safe: whatever a prior build already generated inside that
// element is just more balanced <div> markup, so the depth count still lands
// on the right closing tag whether the element is empty (first build) or
// already full (every build after). Every element these markers live in is a
// <div> — <a>/<svg>/<span> siblings inside the generated content are ignored,
// which is fine, since only <div> nesting determines this boundary.
function swapMarker(html, marker, inner) {
  const marker_comment = `<!-- ${marker} -->`;
  const startIdx = html.indexOf(marker_comment);
  if (startIdx === -1) {
    console.warn(`⚠️  marker "${marker}" not found on index.html — skipped`);
    return html;
  }
  const contentStart = startIdx + marker_comment.length;
  const tagRe = /<div\b[^>]*>|<\/div>/g;
  tagRe.lastIndex = contentStart;
  let depth = 1; // we're already inside the marker's enclosing <div>
  let contentEnd = -1;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0] === '</div>') {
      depth--;
      if (depth === 0) { contentEnd = m.index; break; }
    } else {
      depth++;
    }
  }
  if (contentEnd === -1) {
    console.warn(`⚠️  marker "${marker}" has no balanced closing </div> — skipped`);
    return html;
  }
  return html.slice(0, contentStart) + inner + html.slice(contentEnd);
}

{
  const indexPath = path.join(ROOT, 'index.html');
  let homeHtml = fs.readFileSync(indexPath, 'utf8');
  homeHtml = swapMarker(homeHtml, 'Skill groups injected here', renderSkillGroups());
  homeHtml = swapMarker(homeHtml, 'Certifications injected here', renderCerts());
  homeHtml = swapMarker(homeHtml, 'Experience items will be injected here', renderExperience());
  homeHtml = swapMarker(homeHtml, 'Projects will be injected here', renderProjects());
  homeHtml = swapMarker(homeHtml, 'Latest blog posts injected from /blog/posts.json. Falls back to a static card.', renderLatestPosts());
  homeHtml = swapRegion(homeHtml, 'SALE-HOME', saleHomeCardHtml());
  fs.writeFileSync(indexPath, homeHtml);
  console.log('✅ pre-rendered / (skills, certs, experience, projects, latest posts)');
}

/* ---------- markdown mirrors for hand-authored pages ----------
   Runs after stamping/CSS-inlining above so the mirror reflects final content.
   https://llmstxt.org proposes a clean markdown version of every page at the
   same URL with .md appended (index.html.md for extensionless URLs). */

for (const page of ['index.html', 'linux-foundation-coupon/index.html', 'privacy/index.html', 'links/index.html', 'docker-captain/index.html']) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const md = htmlFragmentToMarkdown(extractMirrorRegion(html));
  const mdPath = p.replace(/index\.html$/, 'index.html.md');
  const existing = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : null;
  if (md !== existing) {
    fs.writeFileSync(mdPath, md);
    console.log(`✅ mirrored  /${mdPath.replace(ROOT + path.sep, '')}`);
  }
}

/* ---------- prune deleted posts from blog/ ---------- */

const liveSlugs = new Set([...all.map(p => p.slug), 'tags']);
for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory() && !liveSlugs.has(entry.name)) {
    fs.rmSync(path.join(OUT_DIR, entry.name), { recursive: true });
    console.log(`🗑  pruned    /blog/${entry.name}/`);
  }
}

console.log(`\nDone: ${all.length} published, ${scheduled.length} scheduled, ${byYear.size} year group(s).`);
