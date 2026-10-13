import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { Download, Mail } from 'lucide-react';
import { SITE_URL, person } from '@/lib/site';
import { speaking } from '@/lib/speaking';
import { AV_REQUIREMENTS, PRESS_DIR, PRESS_PHOTOS, PRESS_ZIP, type PressPhoto } from '@/lib/speakerKit';
import { SiteShell } from '@/components/site/SiteShell';
import { BioSelector } from '@/components/speaker/BioSelector';
import { CopyButton } from '@/components/speaker/CopyButton';
import { CredentialShelf } from '@/components/CredentialShelf';
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
  { k: 'Programs', v: 'Docker Captain (2026), Grafana Champion (2026)' },
  { k: 'Website', v: 'https://rushabhshah.dev' },
  { k: 'Email', v: person.email },
];

const HANDLES = [
  { k: 'X', v: '@iamrushabhshahh' },
  { k: 'LinkedIn', v: 'linkedin.com/in/iamrushabhshahh' },
  { k: 'GitHub', v: 'github.com/iamrushabhshahh' },
];

const GROUPS: PressPhoto['group'][] = ['Headshots', 'Full length', 'Background removed', 'Ready for posters'];

const h2 = 'mb-2 text-2xl font-bold text-strong';
const lede = 'mb-8 max-w-2xl text-sm leading-relaxed text-muted';
const panel = 'rounded-md border border-[var(--border-color)] bg-[var(--panel-color)]';

const checker =
  'repeating-conic-gradient(rgba(var(--neutral-rgb),0.08) 0% 25%, transparent 0% 50%) 50% / 18px 18px';

export default function SpeakerKitPage() {
  const zipSize = sizeOf('rushabh-shah-press-kit.zip');
  return (
    <SiteShell active="speaking">
      <main id="main" className="container mx-auto px-6 py-16">
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

        <header className="mb-14 max-w-3xl">
          <a href="/speaking/" className="rs-back">&larr; Speaking</a>
          <p className="mb-3 mt-4 font-fira text-xs uppercase tracking-[0.14em] text-[var(--rs-sig-text)]">For organisers</p>
          <h1 className="rs-h2" style={{ marginTop: 0 }}>
            Speaker kit
          </h1>
          <p className="text-lg leading-relaxed text-body">
            Everything your programme, website and social posts need, pre-approved. Copy and download what you need
            without asking first.
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
          <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
            {[
              ['#facts', 'Quick facts'],
              ['#bios', 'Bios'],
              ['#photos', 'Photos'],
              ['#topics', 'Talks'],
              ['#stage', 'Stage and AV'],
              ['#credentials', 'Credentials'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rs-chip">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <section id="facts" aria-labelledby="facts-h" className="mb-20 scroll-mt-24">
          <h2 id="facts-h" className={h2}>Quick facts</h2>
          <p className={lede}>For the programme, the speaker page and the person writing the intro.</p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {FACTS.map(({ k, v }) => (
                <div key={k} className={`${panel} min-w-0 p-4`}>
                  <dt className="font-fira text-xs uppercase tracking-wider text-muted">{k}</dt>
                  <dd className="mt-1 flex items-center justify-between gap-4 text-sm text-strong">
                    <span className="min-w-0 break-all">{v}</span>
                    <CopyButton value={v} label="Copy" />
                  </dd>
                </div>
              ))}
            </dl>
            <div className={`${panel} min-w-0 p-5`}>
              <p className="font-fira text-xs uppercase tracking-wider text-muted">Tag me when you announce</p>
              <dl className="mt-3">
                {HANDLES.map(({ k, v }) => (
                  <div key={k} className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] py-3 first:border-t-0">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="flex min-w-0 items-center gap-3 text-sm text-strong">
                      <span className="min-w-0 break-all">{v}</span>
                      <CopyButton value={v} label="Copy" />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="bios" aria-labelledby="bios-h" className="mb-20 scroll-mt-24">
          <h2 id="bios-h" className={h2}>Bios</h2>
          <p className={lede}>Three lengths, written in the third person. Use them as they are; shorten only from the end.</p>
          <BioSelector />
        </section>

        <section id="photos" aria-labelledby="photos-h" className="mb-20 scroll-mt-24">
          <h2 id="photos-h" className={h2}>Photos</h2>
          <p className={lede}>
            Crop and resize as your layout needs. The cut-outs have transparent backgrounds for your own event branding.
            Need print resolution or a different crop? Email me and I will send it the same day.
          </p>
          {GROUPS.map((g) => (
            <div key={g} className="mb-10">
              <h3 className="mb-4 font-fira text-xs uppercase tracking-[0.14em] text-muted">{g}</h3>
              <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {PRESS_PHOTOS.filter((p) => p.group === g).map((p) => (
                  <li key={p.file} className={`${panel} flex flex-col overflow-hidden`}>
                    <div
                      className="flex h-56 items-center justify-center bg-[var(--terminal-header)]"
                      style={p.transparent ? { background: checker } : undefined}
                    >
                      <img
                        src={`${PRESS_DIR}previews/${p.file.replace(/\.(jpg|png)$/, '.webp')}`}
                        alt={`${person.name}: ${p.label}`}
                        loading="lazy"
                        className="max-h-56 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <p className="text-sm font-bold text-strong">{p.label}</p>
                      <p className="text-sm text-muted">{p.use}</p>
                      <p className="font-fira text-xs text-muted">
                        {p.px} &middot; {p.file.endsWith('.png') ? 'PNG' : 'JPG'}
                        {sizeOf(p.file) ? ` · ${sizeOf(p.file)}` : ''}
                      </p>
                      <a href={`${PRESS_DIR}${p.file}`} download className="rs-btn rs-btn--sm mt-3 self-start">
                        <Download aria-hidden="true" className="h-4 w-4" />
                        Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section id="topics" aria-labelledby="topics-h" className="mb-20 scroll-mt-24">
          <h2 id="topics-h" className={h2}>Talks I can give</h2>
          <p className={lede}>
            Each has been given or accepted somewhere, and each can be cut to a lightning talk or grown into a workshop.
          </p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {speaking.topics.map((t) => (
              <li key={t.title} className={`${panel} p-5`}>
                <p className="font-bold text-strong">{t.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-body">{t.summary}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <a href="/speaking/" className="text-strong underline underline-offset-4">
              Every past talk, with links to the organisers&apos; pages
            </a>
          </p>
        </section>

        <section id="stage" aria-labelledby="stage-h" className="mb-20 scroll-mt-24">
          <h2 id="stage-h" className={h2}>Stage and AV</h2>
          <p className={lede}>What I need on the day, so nothing surprises your AV team.</p>
          <dl className={`${panel} divide-y divide-[var(--border-color)]`}>
            {AV_REQUIREMENTS.map(({ label, value }) => (
              <div key={label} className="grid gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-4">
                <dt className="font-fira text-xs uppercase tracking-wider text-[var(--accent-orange)]">{label}</dt>
                <dd className="text-sm leading-relaxed text-body">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="credentials" className="mb-20 scroll-mt-24">
          <CredentialShelf heading="Credentials, each linking to the issuer" />
        </section>

        <section aria-labelledby="invite" className={`${panel} p-8`}>
          <h2 id="invite" className={h2}>Invite me</h2>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-body">
            Conferences, meetups, college events and internal tech talks. Based in Ahmedabad, happy to travel, and set up
            to present remotely. Send the date, the audience and the length of the slot.
          </p>
          <a href={`mailto:${person.email}?subject=Speaking%20invitation`} className="rs-btn rs-btn--hot rs-btn--sm">
            <Mail aria-hidden="true" className="h-4 w-4" />
            Invite me to speak
          </a>
        </section>
      </main>
    </SiteShell>
  );
}
