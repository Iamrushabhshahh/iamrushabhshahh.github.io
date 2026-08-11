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
import { marked } from 'marked';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const BLOG_DESC = 'Articles on DevOps, Kubernetes, Docker, observability (Grafana LGTM stack, OpenTelemetry), cloud cost optimization, and Linux, by Rushabh Shah, Docker Captain & Grafana Champion.';

/* ---------- dedicated per-certification discount pages ----------
   /linux-foundation-coupon/<slug>/ — one focused landing page per exam,
   generated from data (not hand-copied HTML) so structure can't drift
   between pages the way the coupon page's duplicated Person JSON-LD once did.

   Scope is deliberately limited to the 6 certs with real, stable search
   volume plus the Kubestronaut bundle, not all ~14 exams RUSHABH30 covers.
   Cranking out a thin page for every exam code risks reading as doorway
   pages to Google (near-identical content that only differs by keyword),
   which can hurt the whole domain's trust — not just those pages. Exam
   domain weightings are intentionally described qualitatively rather than
   with precise percentages: CNCF revises curricula periodically and a
   stale hardcoded number would be a fact this script has no way to verify. */

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
    why: 'The CKA is the credential hiring managers actually check for when a role involves running Kubernetes in production, not just deploying to it. It\'s a live-terminal, performance-based exam — you fix real broken clusters against the clock, not multiple-choice questions — so it certifies you can actually do the job, not just describe it.',
    prepTips: [
      'Practice in a real terminal daily in the weeks before — this exam is a speed test as much as a knowledge test, and muscle memory for kubectl and vim matters more than reading about concepts.',
      'Get comfortable with the allowed documentation (kubernetes.io) during practice, since you\'re allowed to reference it in the real exam — know where to find things fast rather than memorizing everything.',
      'Troubleshooting is the single biggest domain, so spend disproportionate practice time deliberately breaking and fixing clusters, not just deploying happy-path workloads.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is the CKA exam multiple-choice?', a: 'No. It\'s 100% performance-based: you\'re given a live terminal and a set of real Kubernetes clusters, and you complete hands-on tasks against the clock. There\'s no multiple-choice section.' },
      { q: 'Do I need any prerequisite certification for the CKA?', a: 'No. The CKA has no certification prerequisite, though the Linux Foundation recommends some hands-on Kubernetes experience first.' },
      { q: 'How much is the CKA with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}, a saving of roughly $134.` },
      { q: 'Does RUSHABH30 work on the CKA course + exam bundle?', a: 'Yes. The 30% applies whether you buy the exam alone or bundled with the official prep course, and the bundle is usually the better value since it\'s already discounted before the code applies.' },
      { q: 'What should I do after passing the CKA?', a: 'The natural next steps are the CKAD if you also ship applications to Kubernetes, or the CKS if you want the strongest Kubernetes security signal on your CV — CKS requires an active CKA to sit.' },
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
    why: 'The CKAD exists for a real gap: most developers shipping to Kubernetes don\'t need cluster-administration depth — they need to know pods, deployments, config, probes, and how to debug their own workloads fast. It\'s the same performance-based format as the CKA, just scoped to the application layer instead of the platform layer.',
    prepTips: [
      'Focus practice time on the manifest types you\'ll actually write day to day — Deployments, ConfigMaps, Secrets, and probes — since the exam rewards speed writing and editing YAML under time pressure.',
      'Practice debugging a broken Pod from logs and describe output alone; a meaningful slice of the exam is "this deployment is failing, find out why."',
      'Like the CKA, you can reference kubernetes.io during the exam — practice navigating to the exact page you need instead of trying to memorize every flag.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is the CKAD easier than the CKA?', a: 'It\'s narrower, not necessarily easier — CKAD skips cluster-administration topics but goes deep on the application layer (config, probes, multi-container pod patterns) that the CKA only touches lightly.' },
      { q: 'Do I need the CKA before taking the CKAD?', a: 'No. CKAD has no certification prerequisite and is commonly taken by developers who never plan to sit the CKA at all.' },
      { q: 'How much is the CKAD with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is the CKAD hands-on or multiple-choice?', a: 'Hands-on. Like the CKA, it\'s a live-terminal, performance-based exam against real clusters — no multiple-choice questions.' },
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
    why: 'CKS is the one Linux Foundation cert with a real prerequisite — you need an active CKA to even sit it — which is exactly why it carries weight on a CV. It signals you can secure a cluster end to end: hardening, supply-chain integrity, runtime detection, not just administer one.',
    prepTips: [
      'Get your CKA active first; the Linux Foundation checks this at scheduling time, so leave a buffer if yours is close to expiring.',
      'Spend real practice time on tools the exam actually uses hands-on — Falco for runtime detection, network policies, and admission controllers — rather than just reading security theory.',
      'Supply-chain security (image scanning, signing, sane base images) is a newer domain relative to the older CKA/CKAD content; don\'t skip it assuming it\'s a small footnote.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need the CKA before taking the CKS?', a: 'Yes — this is the one Linux Foundation Kubernetes cert with a hard prerequisite. You must hold an active CKA to schedule the CKS.' },
      { q: 'How much is the CKS with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is the CKS worth it if I already have the CKA?', a: 'For anyone doing platform or security work, yes — it\'s one of the strongest security-specific signals you can add to a DevOps CV, and it\'s a natural next step once your CKA is active.' },
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
    why: 'KCNA is the entry point built for people who aren\'t ready for a live-terminal exam yet. It\'s multiple choice, it\'s the cheapest cert in the catalog, and it forces you to learn the cloud-native landscape\'s vocabulary — Kubernetes, containers, observability, GitOps — before you touch a cluster in anger.',
    prepTips: [
      'Treat it as landscape literacy, not hands-on skill — you\'re learning what things are and how they fit together, not memorizing kubectl syntax.',
      'The official CNCF/Linux Foundation curriculum outline is the most efficient study map; work through it topic by topic rather than a single dense course.',
      'If you\'re also considering the CKA later, KCNA is a genuinely useful on-ramp — the vocabulary you learn here removes a lot of friction from CKA prep.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is KCNA a good first certification for beginners?', a: 'Yes — it\'s specifically designed as the entry point into Kubernetes and cloud native, with no hands-on requirement and a lower price than the performance-based exams.' },
      { q: 'How much is KCNA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'Is KCNA hands-on like the CKA?', a: 'No. KCNA is entirely multiple choice, with no live terminal or cluster access required.' },
      { q: 'Should I take KCNA before the CKA?', a: 'It\'s not required, but it\'s a sensible on-ramp if you\'re new to the ecosystem — it builds vocabulary and context that make CKA prep faster.' },
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
      'Pair it with KCNA if you\'re studying both — the fundamentals overlap enough that studying them together is more efficient than sequentially.',
      'This is conceptual security knowledge (threat models, compliance frameworks), not hands-on hardening — save the tool-heavy practice for CKS later.',
      'The 4Cs of cloud native security (Cloud, Cluster, Container, Code) are a recurring framing across the official curriculum and worth understanding cold.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Do I need the CKA or CKS before KCSA?', a: 'No. KCSA has no certification prerequisite and is designed as an entry-level security credential.' },
      { q: 'How much is KCSA with a discount code?', a: `List price is $${250}. With RUSHABH30 it drops to about $${175}.` },
      { q: 'Is KCSA the same as the CKS?', a: 'No — KCSA is a beginner, multiple-choice associate exam on security concepts. CKS is an advanced, hands-on exam that requires an active CKA. They\'re different tiers entirely.' },
      { q: 'Is KCSA hands-on?', a: 'No, it\'s entirely multiple choice, like KCNA.' },
      { q: 'Does RUSHABH30 work on the KCSA course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'lfcs', name: 'LFCS', fullName: 'Linux Foundation Certified System Administrator',
    dest: 'https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/',
    format: 'Performance-based (live terminal, real system)', duration: '2 hours',
    priceList: 445, priceDiscounted: 311, prerequisite: null,
    audience: 'Anyone in an infrastructure role — not Kubernetes-specific — who wants a hands-on Linux fundamentals credential.',
    topics: [
      'Essential commands',
      'Operation of running systems',
      'User and group management',
      'Networking',
      'Service configuration',
      'Storage management',
      'Essential security',
    ],
    why: 'LFCS is honestly underrated in a Kubernetes-heavy job market: a lot of "Kubernetes debugging" sessions are actually Linux debugging sessions wearing a trench coat — DNS, file permissions, systemd units, disk pressure. LFCS certifies the fundamentals that every other Linux Foundation cert quietly assumes you already have.',
    prepTips: [
      'If your Kubernetes troubleshooting keeps bottoming out in "wait, is this actually a Linux problem," take LFCS first — it fills exactly that gap.',
      'It\'s performance-based like the CKA, so practice in a real shell daily rather than just reading man pages.',
      'Storage and networking fundamentals here transfer directly into Kubernetes storage classes and CNI troubleshooting later, so it\'s not wasted effort even if Kubernetes is your end goal.',
    ],
    retakeNote: 'the exam alone, the exam bundled with the official prep course, and a retake within your eligibility window',
    faqs: [
      { q: 'Is LFCS a Kubernetes certification?', a: 'No — LFCS is a general Linux system administration credential. It\'s a strong complement to the Kubernetes certs (CKA/CKAD/CKS) rather than a replacement for them.' },
      { q: 'How much is LFCS with a discount code?', a: `List price is $${445}. With RUSHABH30 it drops to about $${311}.` },
      { q: 'Is LFCS hands-on or multiple-choice?', a: 'Hands-on — it\'s a performance-based exam on a real Linux system, not multiple choice.' },
      { q: 'Should I take LFCS before or after the CKA?', a: 'Before, if you\'re shaky on core Linux — the LFCS fundamentals (networking, storage, permissions) make CKA troubleshooting scenarios much less frustrating.' },
      { q: 'Does RUSHABH30 work on the LFCS course + exam bundle?', a: 'Yes, on the exam alone or bundled with the official prep course.' },
    ],
  },
  {
    slug: 'kubestronaut', name: 'Kubestronaut bundle', fullName: 'Kubestronaut bundle (KCNA + KCSA + CKA + CKAD + CKS)',
    dest: 'https://training.linuxfoundation.org/certification/kubestronaut-bundle/',
    format: 'Bundle of 5 exams (2 multiple-choice, 3 performance-based)', duration: 'Varies per exam',
    priceList: 1645, priceDiscounted: 1151, prerequisite: 'CKS specifically requires an active CKA',
    audience: 'Engineers pursuing official Kubestronaut recognition from CNCF, or anyone who\'s decided to complete the full Kubernetes certification track.',
    topics: [
      'KCNA — Kubernetes and Cloud Native Associate',
      'KCSA — Kubernetes and Cloud Native Security Associate',
      'CKA — Certified Kubernetes Administrator',
      'CKAD — Certified Kubernetes Application Developer',
      'CKS — Certified Kubernetes Security Specialist',
    ],
    why: 'Kubestronaut is CNCF\'s recognition for engineers who hold all five Kubernetes certifications — KCNA, KCSA, CKA, CKAD, and CKS — at the same time. Buying the bundle is the practical way to work toward it: on a five-exam purchase, RUSHABH30 produces the single biggest dollar saving it can generate, and this page runs the actual math instead of just quoting a percentage.',
    prepTips: [
      'Sequence matters: CKS needs an active CKA, so plan CKA before CKS even if you buy all five exams in one bundle purchase.',
      'KCNA and KCSA (both multiple choice) are the fastest wins — knock those out first for early momentum before the three performance-based exams.',
      'Because each cert has its own validity window, think about scheduling cadence up front so you\'re not racing to renew an early cert before you\'ve sat the later ones.',
    ],
    retakeNote: 'the full five-exam bundle; retakes on individual exams follow that exam\'s own eligibility window',
    faqs: [
      { q: 'What is Kubestronaut?', a: 'Kubestronaut is CNCF\'s official recognition for engineers who hold all five Kubernetes certifications — KCNA, KCSA, CKA, CKAD, and CKS — simultaneously.' },
      { q: 'How much does the Kubestronaut bundle cost with a discount code?', a: `List price is $${1645} for all five exams. With RUSHABH30 it drops to about $${1151}, a saving of roughly $494 — the largest single saving RUSHABH30 produces on any purchase.` },
      { q: 'Do I have to pass all five exams at once?', a: 'No — buying the bundle just locks in the discounted price for all five; you can schedule and sit each exam on your own timeline within your eligibility window.' },
      { q: 'Which exam should I take first in the bundle?', a: 'KCNA is the common starting point since it\'s multiple choice and builds vocabulary the other four assume you already know. Save CKS for last since it requires an active CKA.' },
      { q: 'Is there an even bigger bundle than Kubestronaut?', a: 'Yes — the Golden Kubestronaut bundle adds every other CNCF associate exam plus LFCS on top of the five Kubestronaut certs, for engineers going for the full catalog.' },
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

const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

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

const now = new Date();
const all = [];
const scheduled = [];

for (const file of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  if (data.draft === true) { console.log(`⏸  draft     ${file}`); continue; }

  const date = parseDate(data.date);
  if (!date) { console.warn(`⚠️  skipped   ${file} — missing/invalid date`); continue; }
  if (date > now) {
    scheduled.push({ file, date, title: data.title || file.replace(/\.md$/, '') });
    console.log(`⏰ scheduled ${file} — goes live ${date.toISOString()}`);
    continue;
  }

  const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
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
    html: marked.parse(content, { mangle: false, headerIds: true }),
    rawContent: content.trim(),
    minutes: readingTime(content),
  });
}

all.sort((a, b) => b.date - a.date);

/* ---------- shared page chrome ---------- */

const head = ({ title, description, url, ogType = 'website', published, updated, tags, image }) => {
  const ogImage = image ? (image.startsWith('http') ? image : `${SITE}${image}`) : `${SITE}/assets/og-image.jpg`;
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <script>(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
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
    ${!image ? `<meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(AUTHOR)} — DevOps Engineer, Docker Captain, Grafana Champion">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iamrushabhshahh">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImage}">
    ${ogType === 'article' ? `<meta property="article:published_time" content="${isoDate(published)}">
    <meta property="article:modified_time" content="${isoDate(updated)}">
    <meta property="article:author" content="${AUTHOR}">
    ${(tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}` : ''}
    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/fira-code-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/style.css">
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>`;
};

// Shared sun/moon theme-toggle button, reused across every generated page's
// desktop nav and mobile menu. `mobile` swaps in the wider, labelled variant
// styled by #mobile-menu/#site-menu .theme-toggle in style.css.
const themeToggleButton = (mobile = false) => `<button id="${mobile ? 'theme-toggle-mobile' : 'theme-toggle'}" class="theme-toggle${mobile ? ' flex items-center' : ''}" type="button" aria-label="Switch to light theme">
                <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>
                <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>`;

// Click-handler logic, identical to index.html's inline copy — kept as one
// string so every generated page's DOMContentLoaded block can splice it in.
const themeToggleScript = `
            const themeMetaEl = document.querySelector('meta[name="theme-color"]');
            const themeButtons = [document.getElementById('theme-toggle'), document.getElementById('theme-toggle-mobile')].filter(Boolean);
            const setThemeLabel = (theme) => {
                const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
                themeButtons.forEach(btn => btn.setAttribute('aria-label', label));
            };
            const applyTheme = (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                if (themeMetaEl) themeMetaEl.setAttribute('content', theme === 'light' ? '#f6f8fa' : '#010409');
                setThemeLabel(theme);
            };
            setThemeLabel(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
            themeButtons.forEach(btn => btn.addEventListener('click', () => {
                const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                try { localStorage.setItem('theme', next); } catch (_) {}
                applyTheme(next);
            }));`;

const header = `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="hidden md:flex items-center space-x-6 text-sm">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors">./about</a>
                <a href="/#honors" class="text-gray-400 hover:text-primary-color transition-colors">./honors</a>
                <a href="/#skills" class="text-gray-400 hover:text-primary-color transition-colors">./skills</a>
                <a href="/#experience" class="text-gray-400 hover:text-primary-color transition-colors">./experience</a>
                <a href="/#projects" class="text-gray-400 hover:text-primary-color transition-colors">./projects</a>
                <a href="/blog/" class="text-primary-color transition-colors" aria-current="true">./blog</a>
                <a href="/linux-foundation-coupon/" class="text-gray-400 hover:text-primary-color transition-colors">./deals</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
                ${themeToggleButton()}
            </div>
            <button id="menu-btn" class="md:hidden" aria-controls="site-menu" aria-expanded="false" aria-label="Toggle navigation menu">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
        </nav>
        <div id="site-menu" class="hidden md:hidden bg-terminal-header/90 font-fira">
            <a href="/#about" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./about</a>
            <a href="/#honors" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./honors</a>
            <a href="/#skills" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./skills</a>
            <a href="/#experience" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./experience</a>
            <a href="/#projects" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./projects</a>
            <a href="/blog/" class="block py-2 px-4 text-sm text-primary-color">./blog</a>
            <a href="/linux-foundation-coupon/" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./deals</a>
            <a href="/#contact" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./contact</a>
            ${themeToggleButton(true)}
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
            ${themeToggleScript}
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
  return `<p class="font-fira text-sm text-gray-400 mt-5">Also: <a href="/linux-foundation-coupon/" class="text-primary-color hover:underline">${anchor}</a>.</p>`;
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
                const t = c.textContent;
                c.textContent = 'Copied!';
                setTimeout(() => { c.textContent = t; }, 2000);
            }).catch(() => {});
        });
        const s = document.getElementById('native-share');
        if (s && navigator.share) {
            s.classList.remove('hidden');
            s.addEventListener('click', () => {
                navigator.share({ title: s.dataset.title, url: s.dataset.url }).catch(() => {});
            });
        }
    });
    </script>`;

  const html = `${head({ title: `${post.title} · ${AUTHOR}`, description: post.description, url, ogType: 'article', published: post.date, updated: post.updated, tags: post.tags, image: post.cover })}
<body>
${header}
    <main id="main" class="container mx-auto px-6 py-12">
        <article class="max-w-3xl mx-auto">
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

const postCard = (p, { pinned = false } = {}) => `
                    <a href="/blog/${p.slug}/" class="tech-card p-6 rounded-md group block${pinned ? ' pinned-card' : ''}">
                        <div class="flex flex-col sm:flex-row gap-5">
                            ${p.cover ? `<img src="${p.cover}" alt="" loading="lazy" decoding="async" class="w-full sm:w-44 h-36 sm:h-28 object-cover rounded-lg border border-border-color flex-shrink-0">` : ''}
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

for (const page of ['index.html', 'linux-foundation-coupon/index.html', 'privacy/index.html', 'links/index.html']) {
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

const certHeader = `
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="sticky top-0 z-40 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <nav class="container mx-auto px-6 py-3 flex justify-between items-center font-fira" aria-label="Primary">
            <a href="/" class="text-lg font-bold text-white">RUSHABHSHAH.DEV</a>
            <div class="hidden md:flex items-center space-x-6 text-sm">
                <a href="/#about" class="text-gray-400 hover:text-primary-color transition-colors">./about</a>
                <a href="/#honors" class="text-gray-400 hover:text-primary-color transition-colors">./honors</a>
                <a href="/#skills" class="text-gray-400 hover:text-primary-color transition-colors">./skills</a>
                <a href="/#experience" class="text-gray-400 hover:text-primary-color transition-colors">./experience</a>
                <a href="/#projects" class="text-gray-400 hover:text-primary-color transition-colors">./projects</a>
                <a href="/blog/" class="text-gray-400 hover:text-primary-color transition-colors">./blog</a>
                <a href="/linux-foundation-coupon/" class="text-primary-color transition-colors" aria-current="true">./deals</a>
                <a href="/#contact" class="text-gray-400 hover:text-primary-color transition-colors">./contact</a>
                ${themeToggleButton()}
            </div>
            <button id="menu-btn" class="md:hidden" aria-controls="site-menu" aria-expanded="false" aria-label="Toggle navigation menu">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
        </nav>
        <div id="site-menu" class="hidden md:hidden bg-terminal-header/90 font-fira">
            <a href="/#about" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./about</a>
            <a href="/#honors" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./honors</a>
            <a href="/#skills" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./skills</a>
            <a href="/#experience" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./experience</a>
            <a href="/#projects" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./projects</a>
            <a href="/blog/" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./blog</a>
            <a href="/linux-foundation-coupon/" class="block py-2 px-4 text-sm text-primary-color">./deals</a>
            <a href="/#contact" class="block py-2 px-4 text-sm hover:bg-primary-color/10">./contact</a>
            ${themeToggleButton(true)}
        </div>
    </header>`;

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
                        const t = btn.textContent;
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = t; }, 2000);
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
            ${themeToggleScript}
        });
    </script>`;

function certPageHtml(c, siblings) {
  const url = `${SITE}/linux-foundation-coupon/${c.slug}/`;
  const title = `${c.name} Discount Code (${MONTH_YEAR}): 30% Off with RUSHABH30 · ${AUTHOR}`;
  const description = `Code RUSHABH30 gets 30% off the ${c.fullName} (${c.name}) exam${c.slug === 'kubestronaut' ? ' bundle' : ''}: ~$${c.priceDiscounted} instead of $${c.priceList}. Verified partner code, no expiry.`;
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

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <script>(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
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

    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/fira-code-var.woff2" as="font" type="font/woff2" crossorigin>
    <style data-inline-css>${cssMin}</style>
    <script data-goatcounter="https://rushabhshah.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>

    <script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(webPageJsonLd)}</script>
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
                <div class="flex flex-wrap items-center gap-5">
                    <span class="code-box">
                        RUSHABH30
                        <button type="button" class="chip copy-code" data-code="RUSHABH30" aria-label="Copy coupon code RUSHABH30">Copy</button>
                    </span>
                    <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored" class="btn btn-primary">Get ${escapeHtml(c.name)} for ~$${c.priceDiscounted} &rarr;</a>
                </div>
            </header>

            <div class="post-prose">
                <p>
                    Put <code>RUSHABH30</code> in the coupon field at checkout on
                    <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored">training.linuxfoundation.org</a>
                    and the ${escapeHtml(c.fullName)} (${escapeHtml(c.name)})${c.slug === 'kubestronaut' ? ' bundle' : ' exam'} drops from $${c.priceList} to about $${c.priceDiscounted} &mdash; a saving of roughly $${savings}. It's an evergreen partner code with no expiry, issued directly to me through the official Linux Foundation Education affiliate program.
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
                    <li>Add the ${escapeHtml(c.name)}${c.slug === 'kubestronaut' ? ' bundle' : ' exam'} to your cart on <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored">training.linuxfoundation.org</a>.</li>
                    <li>Enter <code>RUSHABH30</code> in the coupon field at checkout.</li>
                    <li>The total drops 30%. RUSHABH30 works on ${c.retakeNote}.</li>
                </ol>
            </div>

            <div class="tech-card p-5 rounded-md mt-8 flex flex-wrap items-center justify-between gap-4">
                <span class="code-box">
                    RUSHABH30
                    <button type="button" class="chip copy-code" data-code="RUSHABH30" aria-label="Copy coupon code RUSHABH30">Copy</button>
                </span>
                <a href="${awinLink(c.dest)}" target="_blank" rel="noopener sponsored" class="btn btn-primary">Apply it at checkout &rarr;</a>
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

            <div class="post-prose mt-8">
                <h2 id="other-certs">Other Linux Foundation &amp; CNCF certifications</h2>
                <p>RUSHABH30 works on every Linux Foundation and CNCF course and certification, not just ${escapeHtml(c.name)}. Dedicated discount guides:</p>
                <ul>
                    ${siblings.filter(s => s.slug !== c.slug).map(s => `<li><a href="/linux-foundation-coupon/${s.slug}/">${escapeHtml(s.name)} discount code</a></li>`).join('\n                    ')}
                </ul>
                <p>Or see the <a href="/linux-foundation-coupon/">full Linux Foundation coupon overview</a> for pricing across the whole catalog, including KCSA, PCA, OTCA, ICA, CCA, CGOA, CAPA, and LFCA.</p>
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
  { title: 'AWS SAA-C03 Prep', desc: 'Study materials and practice exams for the AWS Certified Solutions Architect – Associate exam.', link: 'https://github.com/Iamrushabhshahh/AWS-Certified-Solutions-Architect-Associate-SAA-C03-Exam-Dump-With-Solution', repo: 'Iamrushabhshahh/AWS-Certified-Solutions-Architect-Associate-SAA-C03-Exam-Dump-With-Solution', tags: ['AWS', 'Certification', 'Study Guide'], if: 'logos/aws' },
  { title: 'Azure AZ-104 Prep', desc: 'A hub for Azure Administrator (AZ-104) exam prep with questions and solutions.', link: 'https://github.com/Iamrushabhshahh/Microsoft-Azure-Administrator-AZ-104-Exam-Dump-Question-With-Solution', repo: 'Iamrushabhshahh/Microsoft-Azure-Administrator-AZ-104-Exam-Dump-Question-With-Solution', tags: ['Azure', 'Certification', 'DevOps'], if: 'logos/microsoft-azure' },
  { title: 'Personal Tech Blog', desc: 'My blog, right here on rushabhshah.dev: DevOps, Kubernetes, observability, cloud cost, and Linux. Earlier posts are archived on Hashnode.', link: '/blog/', tags: ['Blog', 'Observability', 'Linux', 'DevOps'], feather: 'book-open' },
];

const renderSkillGroups = () => SKILL_GROUPS.map((group, gi) => {
  const chips = group.items.map(s => {
    let ic;
    if (s.if) {
      ic = `<img src="https://api.iconify.design/${s.if}.svg" alt="" loading="lazy" width="16" height="16">`;
    } else if (s.si) {
      ic = `<img class="mono-icon" src="https://cdn.simpleicons.org/${s.si}/c9d1d9" alt="" loading="lazy" width="16" height="16">`;
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
    iconHtml = `<img src="${proj.src}" alt="" loading="lazy" width="70" height="24" class="h-6 w-auto">`;
  } else if (proj.if) {
    iconHtml = `<img src="https://api.iconify.design/${proj.if}.svg" alt="" loading="lazy" class="w-6 h-6">`;
  } else if (proj.si) {
    iconHtml = `<img src="https://cdn.simpleicons.org/${proj.si}/58a6ff" alt="" loading="lazy" class="w-6 h-6">`;
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
                        ${p.cover ? `<img src="${p.cover}" alt="" loading="lazy" class="w-full h-36 object-cover">` : ''}
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
  fs.writeFileSync(indexPath, homeHtml);
  console.log('✅ pre-rendered / (skills, certs, experience, projects, latest posts)');
}

/* ---------- markdown mirrors for hand-authored pages ----------
   Runs after stamping/CSS-inlining above so the mirror reflects final content.
   https://llmstxt.org proposes a clean markdown version of every page at the
   same URL with .md appended (index.html.md for extensionless URLs). */

for (const page of ['index.html', 'linux-foundation-coupon/index.html', 'privacy/index.html', 'links/index.html']) {
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
