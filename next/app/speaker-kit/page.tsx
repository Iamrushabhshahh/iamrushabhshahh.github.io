import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ArrowUpRight, CalendarDays, Download, Mail } from 'lucide-react';
import { SITE_URL, bios, credentials, person } from '@/lib/site';
import { certs } from '@/lib/certs';
import { endsAt, isStage } from '@/lib/engagement';
import { speaking, stats } from '@/lib/speaking';
import { AV_REQUIREMENTS, BOOKING_URL, PRESS_DIR, PRESS_PHOTOS, PRESS_ZIP } from '@/lib/speakerKit';
import { SiteShell } from '@/components/site/SiteShell';
import { CopyButton } from '@/components/speaker/CopyButton';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Speaker kit';
const DESCRIPTION =
  'Rushabh Shah speaker kit for organisers: pre-approved bios in three lengths, headshots and full-length photos, background-removed cut-outs, talk topics and stage requirements, all downloadable in one zip.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/speaker-kit/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/speaker-kit/` },
};

/** File sizes are read at build time, so the labels never go stale. */
const ASSETS = path.join(process.cwd(), '..', 'assets', 'press');
const sizeOf = (file: string) => {
  try {
    const b = fs.statSync(path.join(ASSETS, file)).size;
    return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
  } catch {
    return '';
  }
};

const FACTS = [
  { k: 'Name', v: person.name },
  { k: 'Title', v: `${person.jobTitle}, ${person.employer}` },
  { k: 'Based in', v: 'Ahmedabad, India (IST, UTC+5:30)' },
  { k: 'Programmes', v: 'Docker Captain, Grafana Champion' },
  { k: 'Website', v: 'rushabhshah.dev' },
  { k: 'Email', v: person.email },
];

const HANDLES = [
  { k: 'X', v: '@iamrushabhshahh' },
  { k: 'LinkedIn', v: 'linkedin.com/in/iamrushabhshahh' },
  { k: 'GitHub', v: 'github.com/iamrushabhshahh' },
];

const PROGRAMMES = credentials.filter((c) => c.id === 'docker-captain' || c.id === 'grafana-champion');

/** Same list as the band on the home page: stages given or booked, and the communities I run. */
const STAGES = [
  'Open Source Summit Japan',
  'FluxCon North America',
  'PromCon EU',
  'Open Compliance Summit',
  'KubeCon India',
  'KCD Gujarat',
  'Cloud Native Vadodara',
  'Grafana & Friends Ahmedabad',
  'Docker Ahmedabad',
  'Parul University',
];

const BIO_CARDS = [
  { n: 50 as const, label: 'Short', use: 'Programme listings and social posts' },
  { n: 100 as const, label: 'Medium', use: 'Speaker pages and Sessionize' },
  { n: 250 as const, label: 'Long', use: 'Printed programmes and the person introducing me' },
];

const words = (t: string) => t.trim().split(/\s+/).length;
const panel = 'rounded-2xl border border-[var(--border-color)] bg-[var(--panel-color)]';
const sec = 'mb-28 scroll-mt-36';
const checker =
  'repeating-conic-gradient(rgba(var(--neutral-rgb),0.09) 0% 25%, transparent 0% 50%) 50% / 18px 18px';
const fmtDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function SecHead({ n, id, title, lede }: { n: string; id: string; title: string; lede: string }) {
  return (
    <header className="mb-10 grid gap-3 md:grid-cols-[1fr_1.2fr] md:items-end">
      <div>
        <p className="rs-kicker m-0">{n}</p>
        <h2 id={id} className="kit-h2">{title}</h2>
      </div>
      <p className="m-0 max-w-xl text-sm leading-relaxed text-muted md:justify-self-end">{lede}</p>
    </header>
  );
}

export default function SpeakerKitPage() {
  const zipSize = sizeOf('rushabh-shah-press-kit.zip');
  const now = Date.now();
  const s = stats(now);
  const next = speaking.engagements
    .filter((e) => isStage(e) && endsAt(e) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  const earned = certs.filter((c) => c.status === 'earned').map((c) => c.code);
  const preview = (f: string) => `${PRESS_DIR}previews/${f.replace(/\.(jpg|png)$/, '.webp')}`;
  const meta = (f: string, px: string) => `${px} · ${f.endsWith('.png') ? 'PNG' : 'JPG'}${sizeOf(f) ? ` · ${sizeOf(f)}` : ''}`;

  return (
    <SiteShell active="speaking">
      <main id="main" className="container mx-auto px-6 pb-20 pt-8">
        <ItemPageSchema
          path="/speaker-kit/"
          name={TITLE}
          description={DESCRIPTION}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'Speaking', path: '/speaking/' },
            { name: 'Speaker kit', path: '/speaker-kit/' },
          ]}
        />
        <a href="/speaking/" className="rs-back">&larr; Speaking</a>

        <section aria-labelledby="kit-title" className="kit-hero">
          <div className="kit-hero__copy">
            <p className="rs-kicker m-0">Speaker kit &middot; for organisers</p>
            <h1 id="kit-title" className="kit-hero__name">Rushabh Shah</h1>
            <p className="kit-hero__lede">
              Open source educator, Docker Captain and Grafana Champion. I speak about Kubernetes, observability and
              getting started in open source. Everything below is approved: copy and download without asking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="rs-btn rs-btn--hot" href={PRESS_ZIP} download>
                <Download aria-hidden="true" className="h-4 w-4" />
                Download all{zipSize ? ` (${zipSize})` : ''}
              </a>
              <a className="rs-btn" href="#invite">
                <Mail aria-hidden="true" className="h-4 w-4" />
                Invite me to speak
              </a>
            </div>
            <dl className="kit-hero__stats">
              <div><dt>Talks</dt><dd>{s.given + s.upcoming}</dd></div>
              <div><dt>Cities</dt><dd>{s.cities}</dd></div>
              <div><dt>Since</dt><dd>{s.since}</dd></div>
            </dl>
          </div>
          <div className="kit-hero__art" aria-hidden="true">
            <img src="/assets/press/previews/rushabh-shah-cutout-full.webp" alt="" width={360} height={847} />
          </div>
        </section>

        <div className="mb-16 mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {next.length > 0 && (
            <aside aria-label="Next on stage" className={`${panel} p-5`}>
              <p className="rs-kicker m-0 mb-3">Next on stage</p>
              <ul className="m-0 grid list-none gap-2 p-0">
                {next.map((e) => (
                  <li key={e.slug} className="flex min-w-0 items-baseline gap-3 text-sm">
                    <span className="w-14 shrink-0 font-fira text-xs text-muted">{fmtDay(e.start)}</span>
                    <span className="truncate font-bold text-strong" title={e.event}>{e.event}</span>
                    <span className="ml-auto hidden shrink-0 text-xs text-muted sm:inline">{e.city}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <aside aria-label="Stages and communities" className={`${panel} p-5`}>
            <p className="rs-kicker m-0 mb-3">Stages and communities</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {STAGES.map((n) => (
                <li key={n} className="rs-chip">{n}</li>
              ))}
            </ul>
          </aside>
        </div>

        <nav aria-label="On this page" className="kit-nav">
          {[
            ['#bios', '01 Bios'],
            ['#photos', '02 Photos'],
            ['#facts', '03 Quick facts'],
            ['#topics', '04 Talks'],
            ['#stage', '05 Stage and AV'],
            ['#invite', '06 Invite'],
          ].map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>

        <section id="bios" aria-labelledby="bios-h" className={sec}>
          <SecHead n="01" id="bios-h" title="Bios" lede="Three lengths, in the third person. Use them as they are, or shorten from the end." />
          <div className="grid gap-5 lg:grid-cols-2">
            {BIO_CARDS.map(({ n, label, use }) => (
              <article key={n} className={`${panel} flex flex-col p-6 ${n === 250 ? 'lg:col-span-2' : ''}`}>
                <header className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="m-0 font-bold text-strong">{label} <span className="font-fira text-xs font-normal text-muted">&middot; {words(bios[n])} words</span></p>
                    <p className="m-0 mt-1 text-xs text-muted">{use}</p>
                  </div>
                  <CopyButton value={bios[n]} label="Copy" />
                </header>
                <p className={`m-0 text-[15px] leading-relaxed text-body ${n === 250 ? 'lg:columns-2 lg:gap-10' : ''}`}>{bios[n]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="photos" aria-labelledby="photos-h" className={sec}>
          <SecHead
            n="02"
            id="photos-h"
            title="Photos"
            lede="Crop and resize as your layout needs. Cut-outs have transparent backgrounds for your own branding. Need print resolution? Email me and I will send it the same day."
          />
          <ul className="kit-gallery">
            {PRESS_PHOTOS.map((p, i) => (
              <li key={p.file} className={`kit-shot ${i === 0 ? 'kit-shot--feature' : ''}`} style={p.transparent ? { background: checker } : undefined}>
                <img
                  src={i === 0 ? `${PRESS_DIR}${p.file}` : preview(p.file)}
                  alt={`${person.name}: ${p.label}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className={p.transparent ? 'object-contain' : 'object-cover'}
                />
                <span className="kit-shot__tag">{p.group}</span>
                <div className="kit-shot__bar">
                  <span className="min-w-0">
                    <b>{p.label}</b>
                    <small>{meta(p.file, p.px)}</small>
                  </span>
                  <a href={`${PRESS_DIR}${p.file}`} download aria-label={`Download ${p.label}`}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="facts" aria-labelledby="facts-h" className={sec}>
          <SecHead n="03" id="facts-h" title="Quick facts" lede="For the programme, the speaker page and the person writing the intro." />
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <dl className={`${panel} m-0 grid min-w-0 sm:grid-cols-2`}>
              {FACTS.map(({ k, v }) => (
                <div key={k} className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border-color)] p-4 sm:[&:nth-last-child(-n+2)]:border-b-0">
                  <div className="min-w-0">
                    <dt className="font-fira text-xs uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="m-0 mt-1 break-words text-sm text-strong">{v}</dd>
                  </div>
                  <CopyButton value={v} label="Copy" />
                </div>
              ))}
            </dl>
            <div className={`${panel} min-w-0 p-4`}>
              <p className="m-0 font-fira text-xs uppercase tracking-wider text-muted">Tag me when you announce</p>
              <dl className="m-0 mt-2">
                {HANDLES.map(({ k, v }) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] py-3 first:border-t-0">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="m-0 break-all text-sm text-strong">{v}</dd>
                    </div>
                    <CopyButton value={v} label="Copy" />
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {PROGRAMMES.map((c) => (
              <a key={c.id} href={c.proofUrl} target="_blank" rel="noopener" className={`${panel} flex items-center gap-4 p-5 no-underline transition-colors hover:border-[var(--rs-sig-text)]`}>
                {c.icon && <img src={c.icon} alt="" width={36} height={36} className="h-9 w-9 shrink-0" />}
                <span className="min-w-0">
                  <span className="block font-bold text-strong">{c.label}</span>
                  <span className="block text-sm text-muted">{c.issuer} &middot; selected {c.year}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted" />
              </a>
            ))}
          </div>
          {earned.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              Certifications: {earned.join(', ')}.{' '}
              <a href="/certs/" className="text-strong underline underline-offset-4">Verify each one</a>
            </p>
          )}
        </section>

        <section id="topics" aria-labelledby="topics-h" className={sec}>
          <SecHead
            n="04"
            id="topics-h"
            title="Talks I can give"
            lede="Each one has been given or accepted somewhere. Any of them works as a lightning talk, a full session or a hands-on workshop."
          />
          <ol className="kit-talks">
            {speaking.topics.map((t, i) => (
              <li key={t.title}>
                <span className="kit-talks__n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <b>{t.title}</b>
                  <span>{t.summary}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm">
            <a href="/speaking/" className="text-strong underline underline-offset-4">
              Every past talk, with links to the organisers&apos; pages
            </a>
          </p>
        </section>

        <section id="stage" aria-labelledby="stage-h" className={sec}>
          <SecHead n="05" id="stage-h" title="Stage and AV" lede="What I need on the day, so nothing surprises your AV team." />
          <dl className={`${panel} m-0 grid sm:grid-cols-2 lg:grid-cols-3`}>
            {AV_REQUIREMENTS.map(({ label, value }) => (
              <div key={label} className="kit-av">
                <dt className="font-fira text-xs uppercase tracking-wider text-[var(--rs-sig-text)]">{label}</dt>
                <dd className="m-0 mt-2 text-sm leading-relaxed text-body">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="invite" aria-labelledby="invite-h" className="kit-invite">
          <div>
            <p className="kit-invite__kicker">06 &middot; Invite me</p>
            <h2 id="invite-h">Have a date and an audience?</h2>
            <p>
              Conferences, meetups, college events and internal tech talks. I am based in Ahmedabad, happy to travel and
              set up to present remotely. Send the date, the audience and the slot length, or pick a time to talk it
              through.
            </p>
          </div>
          <div className="kit-invite__actions">
            <a href={`mailto:${person.email}?subject=Speaking%20invitation`} className="kit-invite__primary">
              <Mail aria-hidden="true" className="h-4 w-4" />
              Email the invitation
            </a>
            <a href={BOOKING_URL} target="_blank" rel="noopener" className="kit-invite__secondary">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Book a 20 minute call
            </a>
            <span className="kit-invite__mail">{person.email}</span>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
