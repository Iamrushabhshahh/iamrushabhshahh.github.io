import type { Metadata } from 'next';
import { Download, Mail, Mic } from 'lucide-react';
import talksRaw from '@/content/talks/talks.json';
import { talkSchema, type Talk } from '@/lib/schemas';
import { person, SITE_URL } from '@/lib/site';
import { BioSelector } from '@/components/speaker/BioSelector';
import { TalkGrid } from '@/components/speaker/TalkGrid';
import { CopyButton } from '@/components/speaker/CopyButton';
import { CredentialShelf } from '@/components/CredentialShelf';
import { PersonSchema, SpeakerProfileSchema, ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Speaker kit · Rushabh Shah';
const DESCRIPTION =
  'Pre-approved bios, headshots, AV requirements and past talks for Rushabh Shah, Docker Captain and Grafana Champion. Everything a conference organiser needs, in one page.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/speaker/` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/speaker/`,
    type: 'profile',
    images: [{ url: `${SITE_URL}/assets/og-speaker.jpg`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

/**
 * Validated at module scope, so a malformed talk fails `next build` rather than
 * rendering a broken card in production. This is the whole point of the Zod
 * layer: the existing pipeline has no frontmatter validation and cannot fail
 * this way.
 */
const talks: Talk[] = talksRaw.map((t) => talkSchema.parse(t));

/** Stage and AV requirements. Organisers copy this block into a run sheet. */
const AV_REQUIREMENTS = [
  { label: 'Microphone', value: 'Lavalier or headset preferred. Handheld works, but not for a live terminal demo where both hands are on the keyboard.' },
  { label: 'Display', value: '16:9, 1920x1080. Demos run at a raised terminal font size and are legible from the back of the room.' },
  { label: 'Connection', value: 'HDMI. I carry USB-C to HDMI and USB-C to VGA adapters, but a spare on site is always welcome.' },
  { label: 'Machine', value: 'I present from my own laptop (macOS, Apple silicon). Happy to load slides onto a conference machine if the deck is static.' },
  { label: 'Network', value: 'Live demos hit a real cluster. If the venue network is unreliable, tell me in advance and I will switch to a recorded fallback rather than risk dead air.' },
  { label: 'Stage', value: 'No podium preference. Confidence monitor useful but not required.' },
];

const HEADSHOTS = [
  { label: 'Web headshot', file: '/assets/rushabh-shah.webp', note: 'WebP, optimised for screen' },
];

export default function SpeakerPage() {
  return (
    <main id="main" className="container mx-auto px-6 py-16">
      <PersonSchema />
      <SpeakerProfileSchema talks={talks} />
      <ItemPageSchema
        path="/speaker/"
        name={TITLE}
        description={DESCRIPTION}
        image={`${SITE_URL}/assets/og-speaker.jpg`}
        breadcrumb={[
          { name: 'Home', path: '/' },
          { name: 'Speaker kit', path: '/speaker/' },
        ]}
      />

      <header className="mb-14 max-w-3xl">
        <p className="mb-3 font-fira text-xs uppercase tracking-wider text-primary">
          <Mic aria-hidden="true" className="mr-2 inline h-3.5 w-3.5" />
          Speaker kit
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          Everything you need to put me on your programme
        </h1>
        <p className="text-base leading-relaxed text-body">
          Bios at three lengths, headshots, AV requirements and the talk archive. All of it is
          pre-approved, so nothing here needs a follow-up email to confirm. If something is missing,{' '}
          <a href={`mailto:${person.email}`} className="text-primary hover:underline">
            ask me directly
          </a>
          .
        </p>
      </header>

      <section aria-labelledby="bios" className="mb-16">
        <h2 id="bios" className="mb-2 text-2xl font-bold text-strong">
          Bios
        </h2>
        <p className="mb-6 text-sm text-muted">
          Pick the length your programme template needs. The number in brackets is the real word
          count, not the nominal one.
        </p>
        <BioSelector />
      </section>

      <section aria-labelledby="identity" className="mb-16">
        <h2 id="identity" className="mb-6 text-2xl font-bold text-strong">
          Name, title and headshots
        </h2>
        <dl className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { k: 'Name', v: person.name },
            { k: 'Title', v: `${person.jobTitle}, ${person.employer}` },
            { k: 'Location', v: `${person.location.city}, India` },
            { k: 'Programs', v: 'Docker Captain (2026), Grafana Champion (2026)' },
          ].map(({ k, v }) => (
            <div
              key={k}
              className="flex items-center justify-between gap-4 rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-4"
            >
              <div>
                <dt className="font-fira text-xs uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-1 text-sm text-strong">{v}</dd>
              </div>
              <CopyButton value={v} label="Copy" />
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-4">
          {HEADSHOTS.map((h) => (
            <a
              key={h.file}
              href={h.file}
              download
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border-color)] px-4 py-2 font-fira text-xs text-body transition-colors hover:border-primary hover:text-primary"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              {h.label}
              <span className="text-muted">({h.note})</span>
            </a>
          ))}
        </div>
        <p className="mt-3 font-fira text-xs text-muted">
          Need print resolution? Email me and I will send a 300 DPI file the same day.
        </p>
      </section>

      <section aria-labelledby="av" className="mb-16">
        <h2 id="av" className="mb-2 text-2xl font-bold text-strong">
          Stage and AV requirements
        </h2>
        <p className="mb-6 text-sm text-muted">
          Nothing here is a demand. It is what makes a live terminal demo work in a large room.
        </p>
        <dl className="divide-y divide-[var(--border-color)] rounded-md border border-[var(--border-color)] bg-[var(--panel-color)]">
          {AV_REQUIREMENTS.map(({ label, value }) => (
            <div key={label} className="grid gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="font-fira text-xs uppercase tracking-wider text-primary">{label}</dt>
              <dd className="text-sm leading-relaxed text-body">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="talks" className="mb-16">
        <h2 id="talks" className="mb-6 text-2xl font-bold text-strong">
          Talks
        </h2>
        <TalkGrid talks={talks} />
      </section>

      <section aria-labelledby="creds" className="mb-16">
        <CredentialShelf heading="Credentials, each linking to the issuer" />
      </section>

      <section
        aria-labelledby="booking"
        className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-8"
      >
        <h2 id="booking" className="mb-3 text-2xl font-bold text-strong">
          Booking
        </h2>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-body">
          I speak on Kubernetes operations, observability with the Grafana LGTM stack and
          OpenTelemetry, incident postmortems, and documentation localization. I am based in
          Ahmedabad and travel for events.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href={`mailto:${person.email}?subject=Speaking%20enquiry`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-tint/10 px-4 py-2 font-fira text-sm text-primary transition-colors hover:bg-primary-tint/20"
          >
            <Mail aria-hidden="true" className="h-4 w-4" /> {person.email}
          </a>
          <a
            href="https://sessionize.com/iamrushabhshahh/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-color)] px-4 py-2 font-fira text-sm text-body transition-colors hover:border-primary hover:text-primary"
          >
            Sessionize profile
          </a>
        </div>
      </section>
    </main>
  );
}
