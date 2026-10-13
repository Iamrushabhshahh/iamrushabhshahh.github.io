import type { Metadata } from 'next';
import { Mail, Mic, Quote } from 'lucide-react';
import { person, SITE_URL } from '@/lib/site';
import { speaking, stats } from '@/lib/speaking';
import { endsAt, ymd } from '@/lib/engagement';
import { SiteShell } from '@/components/site/SiteShell';
import { SpeakingTimeline } from '@/components/speaking/SpeakingTimeline';
import { ItemPageSchema, SpeakingSchema } from '@/components/SEO/StructuredData';

const PATH = '/speaking/';
const TITLE = 'Speaking';
const DESCRIPTION =
  'Talks, workshops, hackathon juries and community meetups by Rushabh Shah, Docker Captain and Grafana Champion. Upcoming sessions at FluxCon, Open Source Summit Japan and Open Compliance Summit, plus the full archive and a speaker kit for organizers.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { title: `${TITLE} · ${person.name}`, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: 'profile' },
  twitter: { card: 'summary', title: `${TITLE} · ${person.name}`, description: DESCRIPTION },
};

/** Build time. The timeline re-checks against the reader's clock after load. */
const BUILT_AT = Date.now();

const sinceLabel = (since: string) => {
  const [y, m] = ymd(since);
  return since.length > 4
    ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric' })
    : String(y);
};

export default function SpeakingPage() {
  const s = stats(BUILT_AT);
  const bySlug = new Map(speaking.engagements.map((e) => [e.slug, e]));

  const STATS = [
    { n: s.given, label: 'talks given' },
    { n: s.upcoming, label: 'confirmed and coming up' },
    { n: s.hosted, label: 'meetups hosted' },
    { n: s.hackathons, label: 'hackathons judged or run' },
  ];

  return (
    <SiteShell active="speaking">
      <main id="main" className="container mx-auto px-6 py-16">
        <SpeakingSchema engagements={speaking.engagements} path={PATH} />
        <ItemPageSchema
          path={PATH}
          name={`${TITLE} · ${person.name}`}
          description={DESCRIPTION}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'Speaking', path: PATH },
          ]}
        />

        <header className="mb-16 max-w-3xl">
          <p className="mb-3 font-fira text-xs uppercase tracking-wider text-primary">
            <Mic aria-hidden="true" className="mr-2 inline h-3.5 w-3.5" />
            Speaking
          </p>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
            Talks from production, and the rooms I help run
          </h1>
          <p className="mb-8 text-base leading-relaxed text-body">
            I talk about what I have actually run: Kubernetes recovery, observability with Prometheus and the Grafana
            stack, and containers for AI agents. Off stage I co-organize Grafana &amp; Friends Ahmedabad and help with
            hackathons and community events across Gujarat.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${person.email}?subject=Speaking%20invitation`}
              className="rs-btn rs-btn--hot rs-btn--sm"
            >
              <Mail aria-hidden="true" className="h-4 w-4" /> Invite me to speak
            </a>
            <a
              href="https://sessionize.com/iamrushabhshahh/"
              target="_blank"
              rel="noopener noreferrer"
              className="rs-btn rs-btn--sm"
            >
              Sessionize profile
            </a>
            <a
              href="/speaker-kit/"
              className="rs-btn rs-btn--sm"
            >
              Speaker kit
            </a>
          </div>
        </header>

        <ul aria-label="At a glance" className="mb-20 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-4">
          {STATS.map(({ n, label }) => (
            <li key={label} className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
              <span className="rs-stat">{n}</span>
              <span className="mt-1 block font-fira text-xs text-muted">{label}</span>
            </li>
          ))}
        </ul>

        <SpeakingTimeline engagements={speaking.engagements} builtAt={BUILT_AT} />

        <section aria-labelledby="community" className="mb-20">
          <h2 id="community" className="mb-2 text-2xl font-bold text-strong">
            Ongoing community roles
          </h2>
          <p className="mb-6 text-sm text-muted">The work between events.</p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {speaking.roles.map((r) => (
              <li key={r.org} className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
                <p className="font-fira text-xs text-primary">
                  {r.title} · since {sinceLabel(r.since)}
                </p>
                <h3 className="mt-2 font-bold text-strong">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      {r.org}
                    </a>
                  ) : (
                    r.org
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{r.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="topics" className="mb-20">
          <h2 id="topics" className="mb-2 text-2xl font-bold text-strong">
            Talks I can give
          </h2>
          <p className="mb-6 text-sm text-muted">
            Each one has been given or accepted somewhere already, and each can be cut to a lightning talk or grown into a
            hands-on workshop.
          </p>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {speaking.topics.map((t) => {
              const src = t.basedOn ? bySlug.get(t.basedOn) : undefined;
              return (
                <li key={t.title} className="rounded-lg border border-[var(--border-color)] p-5">
                  <h3 className="font-bold leading-snug text-strong">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{t.summary}</p>
                  {src && (
                    <a href={`#${src.slug}`} className="mt-3 inline-block font-fira text-xs text-primary hover:underline">
                      {endsAt(src) < BUILT_AT ? 'As given at' : 'Coming up at'} {src.event.split(',')[0]}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {speaking.testimonials.length > 0 && (
          <section aria-labelledby="said" className="mb-20">
            <h2 id="said" className="mb-6 text-2xl font-bold text-strong">
              What organizers said
            </h2>
            <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
              {speaking.testimonials.map((q) => (
                <li key={q.quote} className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6">
                  <Quote aria-hidden="true" className="mb-3 h-4 w-4 text-primary" />
                  <blockquote className="text-sm leading-relaxed text-body">{q.quote}</blockquote>
                  <p className="mt-3 font-fira text-xs text-muted">
                    {q.name}, {q.context}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="kit-h" id="kit" className="mb-20 scroll-mt-24">
          <div className="grid items-center gap-6 rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6 md:grid-cols-[auto_1fr_auto] md:p-8">
            <img
              src="/assets/press/previews/rushabh-shah-headshot-square.webp"
              alt=""
              width={96}
              height={96}
              loading="lazy"
              className="h-24 w-24 rounded-full object-cover"
            />
            <div>
              <h2 id="kit-h" className="mb-1 text-2xl font-bold text-strong">Speaker kit</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-body">
                Bios in three lengths, nine photos including background-removed cut-outs, talk topics and AV notes. All
                pre-approved, one zip.
              </p>
            </div>
            <a href="/speaker-kit/" className="rs-btn rs-btn--hot rs-btn--sm justify-self-start">
              Open the speaker kit
            </a>
          </div>
        </section>

        <section
          aria-labelledby="booking"
          className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-8"
        >
          <h2 id="booking" className="mb-3 text-2xl font-bold text-strong">
            Invite me
          </h2>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-body">
            Conferences, meetups, college events and internal tech talks. Based in Ahmedabad, happy to travel, and set up
            to present remotely. Send the date, the audience and the length of the slot.
          </p>
          <a
            href={`mailto:${person.email}?subject=Speaking%20invitation`}
            className="rs-btn rs-btn--hot rs-btn--sm"
          >
            <Mail aria-hidden="true" className="h-4 w-4" /> {person.email}
          </a>
        </section>
      </main>
    </SiteShell>
  );
}
