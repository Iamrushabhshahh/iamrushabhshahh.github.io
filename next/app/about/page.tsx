import type { Metadata } from 'next';
import upstream from '@/content/contributions/upstream.json';
import k8sHindi from '@/content/contributions/kubernetes-hindi.json';
import { SITE_URL, bios, credentials, person } from '@/lib/site';
import { certs } from '@/lib/certs';
import { speaking, stats as speakingStats } from '@/lib/speaking';
import { SiteShell } from '@/components/site/SiteShell';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'About Rushabh Shah';
const DESCRIPTION =
  'Rushabh Shah, DevOps engineer at Orocorp Technologies Private Limited, Docker Captain and Grafana Champion. Recognition, community roles, open source work and certifications, each linked so you can check it.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/about/` },
};

/**
 * Laid out like a speaker's about page: short bio, then dated lists where
 * every claim links to the place that proves it. Everything here is read
 * from content files (speaking.json, certs.json, contributions/*.json and
 * lib/site.ts) so it cannot drift from the rest of the site.
 */

const month = (iso: string) =>
  new Date(`${iso.length === 7 ? `${iso}-01` : iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Mirrors the EXPERIENCE array in ../scripts/build-blog.mjs. Keep both in step. */
const TIMELINE = [
  { role: 'DevOps Engineer', org: 'Orocorp Technologies Private Limited', period: 'Jun 2025 to Present', current: true },
  { role: 'Corporate Trainer', org: 'Koenig Solutions Pvt. Ltd.', period: 'Jun 2025 to Jul 2025' },
  { role: 'DevOps Engineer', org: 'Genuin', period: 'Jan 2025 to May 2025' },
  { role: 'Jr DevOps Engineer', org: 'KodeKloud', period: 'Jul 2024 to Dec 2024' },
  { role: 'Jr DevOps Engineer', org: 'Tridhya Tech Limited', period: 'Jun 2023 to Jun 2024' },
];

/** "Since" years come from the timeline above and the speaking archive. */
const SKILLS = [
  ['Docker and Kubernetes', '2023'],
  ['CI/CD with Jenkins and GitHub Actions', '2023'],
  ['Terraform and Ansible', '2023'],
  ['Azure, AWS and GCP', '2023'],
  ['Prometheus and Grafana', '2024'],
  ['Public speaking (first community talk: Grafana 101)', '2024'],
  ['Community organizing (Grafana & Friends Ahmedabad)', '2024'],
  ['GitOps with Argo CD, and OpenTelemetry', '2025'],
] as const;

const PROFILE_LABEL: [RegExp, string][] = [
  [/github\.com/, 'GitHub'],
  [/linkedin\.com/, 'LinkedIn'],
  [/twitter\.com|x\.com/, 'X'],
  [/docker\.com/, 'Docker Captain profile'],
  [/grafana\.com/, 'Grafana Champions list'],
  [/credly\.com/, 'Credly badges'],
  [/sessionize\.com/, 'Sessionize'],
  [/substack\.com/, 'Substack'],
  [/dev\.to/, 'dev.to'],
  [/reddit\.com/, 'Reddit'],
];
const profiles = person.sameAs.map((url) => ({
  url,
  label: PROFILE_LABEL.find(([re]) => re.test(url))?.[1] ?? new URL(url).hostname,
}));

/** Programmes I was selected into. Contribution metrics sit under open source. */
const RECOGNITION_IDS = ['docker-captain', 'grafana-champion'];
const OSS_IDS = ['ebpf-translator', 'devstats'];

const BADGES = [
  { label: 'Docker Captain', img: '/assets/icons/color/docker-1d63ed.svg', href: 'https://www.docker.com/contributors/rushabh-shah/' },
  {
    label: 'Grafana Champion',
    img: '/assets/icons/color/grafana-f47b20.svg',
    href: 'https://grafana.com/community/champions-full-list/?pg=community-champions&plcmt=pill-banner#:~:text=Rushabh%20Shah,LinkedIn',
  },
];

const h2 = 'mb-5 font-fira text-xs uppercase tracking-[0.14em] text-[var(--rs-sig-text)]';
const row = 'grid gap-1 border-t border-[var(--border-color)] py-4 sm:grid-cols-[130px_1fr] sm:gap-6';
const when = 'font-fira text-xs text-muted pt-0.5';
const link = 'text-strong underline decoration-[var(--border-color)] underline-offset-4 hover:decoration-[var(--primary-color)]';
const tile =
  'flex h-full flex-col items-center gap-3 rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-5 text-center transition-colors hover:border-[var(--primary-color)]';

export default function AboutPage() {
  const ossCreds = OSS_IDS.map((id) => credentials.find((c) => c.id === id)).filter((c) => c !== undefined);
  const recognition = credentials.filter((c) => RECOGNITION_IDS.includes(c.id)).sort((a, b) => b.year - a.year);
  const earned = certs
    .filter((c) => c.status === 'earned')
    .sort((a, b) => (b.earnedOn ?? '').localeCompare(a.earnedOn ?? ''));
  const next = certs.filter((c) => c.status !== 'earned').map((c) => c.code);
  const merged = upstream
    .filter((c) => c.state === 'merged' && c.mergedAt)
    .sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? ''));
  const inReview = [...upstream, ...k8sHindi].filter((c) => c.state === 'open').length;
  const roles = [...speaking.roles].sort((a, b) => b.since.localeCompare(a.since));
  const count = (kinds: string[]) => speaking.engagements.filter((e) => kinds.includes(e.kind)).length;
  const stats = [
    { n: count(['talk', 'lightning', 'workshop']), label: 'talks given or booked' },
    { n: speakingStats(Date.now()).hosted, label: 'meetups hosted' },
    { n: count(['jury', 'organizing']), label: 'hackathons judged or run' },
    { n: count(['volunteer', 'booth']), label: 'volunteer roles' },
  ];

  return (
    <SiteShell active="about">
      <main id="main" className="rs-wrap py-16 md:py-24">
        <ItemPageSchema
          path="/about/"
          name={TITLE}
          description={DESCRIPTION}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about/' },
          ]}
        />

        <header className="mb-14 grid items-center gap-10 md:grid-cols-[220px_1fr]">
          <img
            src="/assets/photos/rushabh-avatar.webp"
            alt="Rushabh Shah"
            width={220}
            height={220}
            className="h-[160px] w-[160px] rounded-full object-cover outline outline-2 outline-offset-4 outline-[var(--primary-color)] md:h-[220px] md:w-[220px]"
          />
          <div className="max-w-3xl">
            <p className={h2}>About</p>
            <h1 className="rs-h2" style={{ marginTop: 0 }}>
              About Rushabh Shah
            </h1>
            <p className="text-lg leading-relaxed text-body">{bios[100]}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rs-btn rs-btn--hot rs-btn--sm" href="mailto:hello@rushabhshah.dev?subject=Speaking%20invitation">
                Request me to speak
              </a>
              <a className="rs-btn rs-btn--sm" href="/#contact">
                Contact me
              </a>
              <a className="rs-btn rs-btn--quiet rs-btn--sm" href="/assets/rushabh-shah-resume.pdf" download>
                Download the r&eacute;sum&eacute;
              </a>
            </div>
          </div>
        </header>

        <nav aria-label="Profiles" className="mb-16 flex flex-wrap gap-2">
          {profiles.map((p) => (
            <a key={p.url} href={p.url} rel="me noopener" target="_blank" className="rs-chip">
              {p.label}
            </a>
          ))}
        </nav>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-x-16">
          <section aria-labelledby="recognition">
            <h2 id="recognition" className={h2}>Recognition</h2>
            <ul>
              {recognition.map((c) => (
                <li key={c.id} className={row}>
                  <span className={when}>{c.year}</span>
                  <span>
                    <a href={c.proofUrl} target="_blank" rel="noopener" className={link}>
                      {c.label}
                    </a>
                    <span className="block text-sm text-muted">{c.issuer}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="community">
            <h2 id="community" className={h2}>Community roles</h2>
            <ul>
              {roles.map((r) => (
                <li key={r.org} className={row}>
                  <span className={when}>since {month(r.since)}</span>
                  <span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener" className={link}>
                        {r.org}
                      </a>
                    ) : (
                      <span className="text-strong">{r.org}</span>
                    )}
                    <span className="block text-sm text-muted">{r.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="oss">
            <h2 id="oss" className={h2}>Open source</h2>
            <ul>
              {ossCreds.map((c) => (
                <li key={c.id} className={row}>
                  <span className={when}>{c.year}</span>
                  <span>
                    <a href={c.proofUrl} target="_blank" rel="noopener" className={link}>
                      {c.id === 'devstats' ? 'CNCF DevStats score: 178' : 'ebpf.io in Hindi'}
                    </a>
                    <span className="block text-sm text-muted">{c.detail}.</span>
                  </span>
                </li>
              ))}
              {merged.map((c) => (
                <li key={c.prUrl} className={row}>
                  <span className={when}>{month(c.mergedAt as string)}</span>
                  <span>
                    <a href={c.prUrl} target="_blank" rel="noopener" className={link}>
                      {c.project} #{c.prNumber}
                    </a>
                    <span className="block text-sm text-muted">
                      {((c.impactSummary ?? '').split('. ')[0] ?? '').replace(/\.$/, '')}.
                    </span>
                  </span>
                </li>
              ))}
              {inReview > 0 && (
                <li className={row}>
                  <span className={when}>in review</span>
                  <span className="text-sm text-body">
                    {inReview} more pull requests, mostly{' '}
                    <a
                      href="https://github.com/kubernetes/website/pulls?q=is%3Apr+author%3Aiamrushabhshahh"
                      target="_blank"
                      rel="noopener"
                      className={link}
                    >
                      Hindi translations of the Kubernetes docs
                    </a>
                    .
                  </span>
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="certs">
            <h2 id="certs" className={h2}>Certifications</h2>
            <ul>
              {earned.map((c) => (
                <li key={c.slug} className={row}>
                  <span className={when}>{c.earnedOn ? month(c.earnedOn) : 'earned'}</span>
                  <span>
                    {c.proofUrl ? (
                      <a href={c.proofUrl} target="_blank" rel="noopener" className={link}>
                        {c.title}
                      </a>
                    ) : (
                      <span className="text-strong">{c.title}</span>
                    )}
                    <span className="block text-sm text-muted">{c.issuer}</span>
                  </span>
                </li>
              ))}
            </ul>
            {next.length > 0 && (
              <p className="mt-4 font-fira text-xs text-muted">
                Studying for next: {next.join(', ')}.{' '}
                <a href="/certs/" className={link}>
                  All certifications
                </a>
              </p>
            )}
          </section>

          <section aria-labelledby="skills">
            <h2 id="skills" className={h2}>Skills</h2>
            <ul>
              {SKILLS.map(([skill, since]) => (
                <li key={skill} className={row}>
                  <span className={when}>since {since}</span>
                  <span className="text-strong">{skill}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="work">
            <h2 id="work" className={h2}>Where I have worked</h2>
            <ol>
              {TIMELINE.map((j) => (
                <li key={`${j.org}-${j.period}`} className={row}>
                  <span className={j.current ? 'pt-0.5 font-fira text-xs text-[color:var(--green-color)]' : when}>
                    {j.period}
                  </span>
                  <span>
                    <span className="text-strong">{j.role}</span>
                    <span className="block text-sm text-muted">{j.org}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-labelledby="speaking" className="mt-20">
          <h2 id="speaking" className={h2}>Speaking</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <li key={s.label} className="rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
                <span className="rs-stat">{s.n}</span>
                <span className="mt-1 block font-fira text-xs text-muted">{s.label}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-wrap gap-2">
            {speaking.topics.map((t) => (
              <li key={t.title}>
                <a href="/speaking/" className="rs-chip">
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="badges" className="mt-20">
          <h2 id="badges" className={h2}>Badges</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BADGES.map((b) => (
              <li key={b.label}>
                <a href={b.href} target="_blank" rel="noopener" className={tile}>
                  <img src={b.img} alt="" width={40} height={40} />
                  <span className="text-sm text-strong">{b.label}</span>
                </a>
              </li>
            ))}
            {earned
              .filter((c) => c.proofUrl)
              .map((c) => (
                <li key={c.slug}>
                  <a href={c.proofUrl} target="_blank" rel="noopener" className={tile}>
                    <img className="mono-icon" src="/assets/icons/mono/kubernetes.svg" alt="" width={40} height={40} />
                    <span className="text-sm text-strong">{c.code}</span>
                    <span className="font-fira text-[0.7rem] text-muted">verify on Credly</span>
                  </a>
                </li>
              ))}
          </ul>
        </section>

        {speaking.testimonials.length > 0 && (
          <section aria-labelledby="said" className="mt-20">
            <h2 id="said" className={h2}>What people said</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {speaking.testimonials.map((t) => (
                <li key={t.name} className="rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-6">
                  <blockquote className="text-body">&ldquo;{t.quote}&rdquo;</blockquote>
                  <p className="mt-3 font-fira text-xs text-muted">
                    {t.name}, {t.context}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-20 rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-8 text-center">
          <p className="rs-h3" style={{ margin: 0 }}>
            Get in touch
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a className="rs-btn rs-btn--hot rs-btn--sm" href="mailto:hello@rushabhshah.dev?subject=Speaking%20invitation">
              Request me to speak
            </a>
            <a className="rs-btn rs-btn--sm" href="/speaker-kit/">
              Speaker kit
            </a>
            <a className="rs-btn rs-btn--sm" href="/#contact">
              Contact me
            </a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
