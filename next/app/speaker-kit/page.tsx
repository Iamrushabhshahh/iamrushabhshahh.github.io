import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ArrowUpRight, CalendarDays, Download, Mail } from 'lucide-react';
import { SITE_URL, credentials, person } from '@/lib/site';
import { certs } from '@/lib/certs';
import { endsAt, isStage } from '@/lib/engagement';
import { speaking, stats } from '@/lib/speaking';
import { AV_REQUIREMENTS, BOOKING_URL, PRESS_DIR, PRESS_PHOTOS, PRESS_ZIP } from '@/lib/speakerKit';
import { SiteShell } from '@/components/site/SiteShell';
import { BioSelector } from '@/components/speaker/BioSelector';
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

const h2 = 'mb-2 text-2xl font-bold text-strong';
const lede = 'mb-8 max-w-2xl text-sm leading-relaxed text-muted';
const panel = 'rounded-xl border border-[var(--border-color)] bg-[var(--panel-color)]';
const sec = 'mb-24 scroll-mt-36';

const checker =
  'repeating-conic-gradient(rgba(var(--neutral-rgb),0.08) 0% 25%, transparent 0% 50%) 50% / 18px 18px';

const fmtDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function SpeakerKitPage() {
  const zipSize = sizeOf('rushabh-shah-press-kit.zip');
  const now = Date.now();
  const s = stats(now);
  const next = speaking.engagements
    .filter((e) => isStage(e) && endsAt(e) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  const earned = certs.filter((c) => c.status === 'earned').map((c) => c.code);
  return (
    <SiteShell active="speaking">
      <main id="main" className="container mx-auto px-6 pb-16 pt-10">
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

        <header className="mb-10 grid items-center gap-10 lg:grid-cols-[1fr_340px]">
          <div className="max-w-3xl">
            <a href="/speaking/" className="rs-back">&larr; Speaking</a>
            <p className="mb-3 mt-4 font-fira text-xs uppercase tracking-[0.14em] text-[var(--rs-sig-text)]">For organisers</p>
            <h1 className="rs-h2" style={{ marginTop: 0 }}>
              Speaker kit
            </h1>
            <p className="text-lg leading-relaxed text-body">
              Bios, photos and everything else for your programme, website and social posts. All of it is approved, so
              copy and download what you need without asking first.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rs-btn rs-btn--hot rs-btn--sm" href={PRESS_ZIP} download>
                <Download aria-hidden="true" className="h-4 w-4" />
                Download everything{zipSize ? ` (zip, ${zipSize})` : ''}
              </a>
              <a className="rs-btn rs-btn--sm" href={`mailto:${person.email}?subject=Speaking%20invitation`}>
                <Mail aria-hidden="true" className="h-4 w-4" />
                Invite me to speak
              </a>
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt className="font-fira text-xs uppercase tracking-wider text-muted">Talks</dt><dd className="m-0 text-xl font-bold text-strong">{s.given + s.upcoming}</dd></div>
              <div><dt className="font-fira text-xs uppercase tracking-wider text-muted">Cities</dt><dd className="m-0 text-xl font-bold text-strong">{s.cities}</dd></div>
              <div><dt className="font-fira text-xs uppercase tracking-wider text-muted">Speaking since</dt><dd className="m-0 text-xl font-bold text-strong">{s.since}</dd></div>
            </dl>
          </div>
          <figure className={`${panel} m-0 w-full max-w-[340px] overflow-hidden`}>
            <img
              src="/assets/press/previews/rushabh-shah-headshot-square.webp"
              alt={`${person.name}, headshot`}
              width={340}
              height={340}
              className="block aspect-square w-full object-cover"
            />
            <figcaption className="p-4 text-sm">
              <b className="block text-strong">{person.name}</b>
              <span className="text-muted">Docker Captain &middot; Grafana Champion</span>
            </figcaption>
          </figure>
        </header>

        {next.length > 0 && (
          <aside aria-label="Next talks" className={`${panel} mb-10 p-5`}>
            <p className="mb-3 font-fira text-xs uppercase tracking-[0.14em] text-[var(--rs-sig-text)]">Next on stage</p>
            <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
              {next.map((e) => (
                <li key={e.slug} className="min-w-0">
                  <p className="m-0 font-fira text-xs text-muted">{fmtDay(e.start)} &middot; {e.city}</p>
                  <p className="m-0 truncate text-sm font-bold text-strong" title={e.event}>{e.event}</p>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <nav
          aria-label="On this page"
          className="sticky top-[70px] z-30 mb-14 flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] border-b border-[var(--border-color)] bg-[rgba(var(--bg-rgb),0.85)] py-3 backdrop-blur"
        >
          {[
            ['#bios', 'Bios'],
            ['#photos', 'Photos'],
            ['#facts', 'Quick facts'],
            ['#topics', 'Talks'],
            ['#stage', 'Stage and AV'],
            ['#programmes', 'Programmes'],
            ['#invite', 'Invite'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rs-chip">
              {label}
            </a>
          ))}
        </nav>

        <section id="bios" aria-labelledby="bios-h" className={sec}>
          <h2 id="bios-h" className={h2}>Bios</h2>
          <p className={lede}>Three lengths, in the third person. Use them as they are, or shorten from the end.</p>
          <BioSelector />
        </section>

        <section id="photos" aria-labelledby="photos-h" className={sec}>
          <h2 id="photos-h" className={h2}>Photos</h2>
          <p className={lede}>
            Crop and resize as your layout needs. The cut-outs have transparent backgrounds for your own event branding.
            Need print resolution or a different crop? Email me and I will send it the same day.
          </p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {PRESS_PHOTOS.map((p) => (
              <li key={p.file} className={`${panel} flex flex-col overflow-hidden`}>
                <div
                  className="relative flex h-60 items-center justify-center bg-[var(--terminal-header)]"
                  style={p.transparent ? { background: checker } : undefined}
                >
                  <img
                    src={`${PRESS_DIR}previews/${p.file.replace(/\.(jpg|png)$/, '.webp')}`}
                    alt={`${person.name}: ${p.label}`}
                    loading="lazy"
                    className="max-h-60 max-w-full object-contain"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[rgba(var(--bg-rgb),0.85)] px-2.5 py-1 font-fira text-[11px] text-strong">
                    {p.group}
                  </span>
                </div>
                <div className="flex flex-1 items-end justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-bold text-strong">{p.label}</p>
                    <p className="m-0 mt-1 text-sm text-muted">{p.use}</p>
                    <p className="m-0 mt-2 font-fira text-xs text-muted">
                      {p.px} &middot; {p.file.endsWith('.png') ? 'PNG' : 'JPG'}
                      {sizeOf(p.file) ? ` · ${sizeOf(p.file)}` : ''}
                    </p>
                  </div>
                  <a
                    href={`${PRESS_DIR}${p.file}`}
                    download
                    className="rs-btn rs-btn--sm shrink-0"
                    aria-label={`Download ${p.label}`}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="facts" aria-labelledby="facts-h" className={sec}>
          <h2 id="facts-h" className={h2}>Quick facts</h2>
          <p className={lede}>For the programme, the speaker page and the person writing the intro.</p>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
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
        </section>

        <section id="topics" aria-labelledby="topics-h" className={sec}>
          <h2 id="topics-h" className={h2}>Talks I can give</h2>
          <p className={lede}>
            Each one has been given or accepted somewhere. Any of them works as a lightning talk, a full session or a
            hands-on workshop.
          </p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {speaking.topics.map((t, i) => (
              <li key={t.title} className={`${panel} flex gap-4 p-5`}>
                <span className="font-fira text-sm text-[var(--rs-sig-text)]">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block font-bold text-strong">{t.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-body">{t.summary}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <a href="/speaking/" className="text-strong underline underline-offset-4">
              Every past talk, with links to the organisers&apos; pages
            </a>
          </p>
        </section>

        <section id="stage" aria-labelledby="stage-h" className={sec}>
          <h2 id="stage-h" className={h2}>Stage and AV</h2>
          <p className={lede}>What I need on the day, so nothing surprises your AV team.</p>
          <dl className={`${panel} m-0 grid sm:grid-cols-2`}>
            {AV_REQUIREMENTS.map(({ label, value }) => (
              <div key={label} className="border-b border-[var(--border-color)] p-5 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r">
                <dt className="font-fira text-xs uppercase tracking-wider text-[var(--rs-sig-text)]">{label}</dt>
                <dd className="m-0 mt-2 text-sm leading-relaxed text-body">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="programmes" aria-labelledby="programmes-h" className={sec}>
          <h2 id="programmes-h" className={h2}>Programmes</h2>
          <p className={lede}>Both link to the programme&apos;s own page, so you can check them there.</p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {PROGRAMMES.map((c) => (
              <li key={c.id}>
                <a href={c.proofUrl} target="_blank" rel="noopener" className={`${panel} flex items-center gap-4 p-5 no-underline transition-colors hover:border-[var(--rs-sig-text)]`}>
                  {c.icon && <img src={c.icon} alt="" width={36} height={36} className="h-9 w-9 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block font-bold text-strong">{c.label}</span>
                    <span className="block text-sm text-muted">{c.issuer} &middot; selected {c.year}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
          {earned.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              Certifications: {earned.join(', ')}.{' '}
              <a href="/certs/" className="text-strong underline underline-offset-4">Verify each one</a>
            </p>
          )}
        </section>

        <section id="invite" aria-labelledby="invite-h" className={`${panel} scroll-mt-36 p-8 md:p-10`}>
          <h2 id="invite-h" className={h2}>Invite me</h2>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-body">
            Conferences, meetups, college events and internal tech talks. I am based in Ahmedabad, happy to travel and
            set up to present remotely. Send the date, the audience and the length of the slot, or pick a time to talk
            it through.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${person.email}?subject=Speaking%20invitation`} className="rs-btn rs-btn--hot rs-btn--sm">
              <Mail aria-hidden="true" className="h-4 w-4" />
              Email the invitation
            </a>
            <a href={BOOKING_URL} target="_blank" rel="noopener" className="rs-btn rs-btn--sm">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Book a 20 minute call
            </a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
