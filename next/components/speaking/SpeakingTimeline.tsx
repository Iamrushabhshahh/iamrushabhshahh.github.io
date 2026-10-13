'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ExternalLink, FileText, Github, MapPin, Play, Presentation, Users } from 'lucide-react';
import type { Engagement } from '@/lib/schemas';
import {
  endsAt,
  FILTERS,
  formatLocalTime,
  formatWhen,
  googleCalendarUrl,
  icsDataUri,
  isStage,
  KIND_LABEL,
  startsAt,
  type FilterKey,
} from '@/lib/engagement';
import { cn } from '@/lib/utils';

/**
 * Upcoming strip plus the filterable archive.
 *
 * Both halves share one clock. The page is rendered at build time with the
 * build's timestamp, then re-checked against the reader's clock on mount, so a
 * talk that happened since the last deploy moves into the archive even if the
 * daily rebuild has not run yet. The first paint matches the server HTML
 * exactly, so there is no hydration mismatch.
 */

const KIND_TONE: Record<Engagement['kind'], string> = {
  talk: 'var(--primary-color)',
  lightning: 'var(--accent-orange)',
  workshop: 'var(--green-color)',
  jury: 'var(--accent-purple)',
  organizing: 'var(--accent-purple)',
  hosting: 'var(--accent-orange)',
  volunteer: 'var(--green-color)',
  booth: 'var(--muted-color)',
};

function KindBadge({ e }: { e: Engagement }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 font-fira text-[0.7rem]"
      style={{ color: KIND_TONE[e.kind], backgroundColor: 'rgba(var(--primary-rgb), 0.08)' }}
    >
      {e.role ?? KIND_LABEL[e.kind]}
    </span>
  );
}

const linkClass =
  'inline-flex items-center gap-1.5 font-fira text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2';

function ext(href: string) {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function Links({ e }: { e: Engagement }) {
  const { session, event, slides, video, repo, post } = e.links;
  if (!session && !event && !slides && !video && !repo && !post && !e.rsvps && !e.attendees) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {session && (
        <a href={session} {...ext(session)} className={linkClass}>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Session page
        </a>
      )}
      {!session && event && (
        <a href={event} {...ext(event)} className={linkClass}>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Event page
        </a>
      )}
      {slides && (
        <a href={slides} {...ext(slides)} className={linkClass}>
          <Presentation aria-hidden="true" className="h-3.5 w-3.5" /> Slides
        </a>
      )}
      {video && (
        <a href={video} {...ext(video)} className={linkClass}>
          <Play aria-hidden="true" className="h-3.5 w-3.5" /> Recording
        </a>
      )}
      {repo && (
        <a href={repo} {...ext(repo)} className={linkClass}>
          <Github aria-hidden="true" className="h-3.5 w-3.5" /> Demo code
        </a>
      )}
      {post && (
        <a href={post} {...ext(post)} className={linkClass}>
          <FileText aria-hidden="true" className="h-3.5 w-3.5" /> Write-up
        </a>
      )}
      {(e.attendees || e.rsvps) && (
        <span className="inline-flex items-center gap-1.5 font-fira text-xs text-muted">
          <Users aria-hidden="true" className="h-3.5 w-3.5" />
          {e.attendees ? `${e.attendees} attended` : `${e.rsvps} RSVPs`}
          {e.attendees && e.rsvps ? ` of ${e.rsvps} RSVPs` : ''}
        </span>
      )}
    </div>
  );
}

function UpcomingCard({ e }: { e: Engagement }) {
  const gcal = googleCalendarUrl(e);
  const ics = icsDataUri(e);
  const time = formatLocalTime(e);
  return (
    <li
      id={e.slug}
      className="flex scroll-mt-24 flex-col rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-fira text-sm text-strong">
          {formatWhen(e)}
          {time && <span className="text-muted"> · {time}</span>}
        </p>
        <KindBadge e={e} />
      </div>
      <h3 className="mb-2 text-lg font-bold leading-snug text-strong">{e.title}</h3>
      <p className="mb-1 text-sm text-body">{e.event}</p>
      <p className="mb-3 inline-flex items-center gap-1.5 font-fira text-xs text-muted">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
        {[e.venue, e.city, e.country].filter(Boolean).join(', ')}
      </p>
      {e.coSpeakers.length > 0 && (
        <p className="mb-3 text-xs text-muted">With {e.coSpeakers.join(', ')}</p>
      )}
      {e.abstract && <p className="text-sm leading-relaxed text-body">{e.abstract}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        {e.links.session && (
          <a href={e.links.session} {...ext(e.links.session)} className={linkClass}>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Session page
          </a>
        )}
        {gcal && (
          <a href={gcal} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <CalendarPlus aria-hidden="true" className="h-3.5 w-3.5" /> Google Calendar
          </a>
        )}
        {ics && (
          <a href={ics} download={`${e.slug}.ics`} className={linkClass}>
            <CalendarPlus aria-hidden="true" className="h-3.5 w-3.5" /> .ics
          </a>
        )}
      </div>
    </li>
  );
}

function ArchiveRow({ e }: { e: Engagement }) {
  return (
    <li id={e.slug} className="grid scroll-mt-24 gap-2 py-5 sm:grid-cols-[120px_1fr] sm:gap-6">
      <p className="font-fira text-xs text-muted sm:pt-1">{formatWhen(e)}</p>
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <KindBadge e={e} />
        </div>
        <h4 className={cn('font-bold leading-snug text-strong', isStage(e) ? 'text-base' : 'text-sm')}>
          {e.title}
        </h4>
        <p className="mt-1 text-sm text-body">
          {e.event}
          <span className="text-muted">
            {' · '}
            {[e.venue, e.city].filter(Boolean).join(', ')}
          </span>
        </p>
        {e.coSpeakers.length > 0 && <p className="mt-1 text-xs text-muted">With {e.coSpeakers.join(', ')}</p>}
        {e.abstract && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-body">{e.abstract}</p>}
        <Links e={e} />
      </div>
    </li>
  );
}

export function SpeakingTimeline({ engagements, builtAt }: { engagements: Engagement[]; builtAt: number }) {
  const [now, setNow] = useState(builtAt);
  const [filter, setFilter] = useState<FilterKey>('all');
  useEffect(() => setNow(Date.now()), []);

  const upcoming = useMemo(
    () => engagements.filter((e) => isStage(e) && endsAt(e) >= now).sort((a, b) => startsAt(a) - startsAt(b)),
    [engagements, now],
  );

  const past = useMemo(
    () => engagements.filter((e) => endsAt(e) < now).sort((a, b) => startsAt(b) - startsAt(a)),
    [engagements, now],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.key, f.kinds ? past.filter((e) => (f.kinds as readonly string[]).includes(e.kind)).length : past.length]),
      ) as Record<FilterKey, number>,
    [past],
  );

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    return f.kinds ? past.filter((e) => (f.kinds as readonly string[]).includes(e.kind)) : past;
  }, [past, filter]);

  const byYear = useMemo(() => {
    const m = new Map<string, Engagement[]>();
    for (const e of shown) {
      const y = e.start.slice(0, 4);
      m.set(y, [...(m.get(y) ?? []), e]);
    }
    return [...m.entries()];
  }, [shown]);

  return (
    <>
      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming" className="mb-20">
          <h2 id="upcoming" className="mb-2 text-2xl font-bold text-strong">
            Next up
          </h2>
          <p className="mb-6 text-sm text-muted">Accepted and on the published schedule. Come and say hello.</p>
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((e) => (
              <UpcomingCard key={e.slug} e={e} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="archive" className="mb-20">
        <h2 id="archive" className="mb-2 text-2xl font-bold text-strong">
          Archive
        </h2>
        <p className="mb-6 text-sm text-muted">
          Every entry links to the organizer&apos;s own page where one exists. Meetup numbers are RSVPs unless they
          say attended.
        </p>

        <div role="group" aria-label="Filter the archive" className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              disabled={counts[f.key] === 0}
              className={cn(
                'rounded-full border px-3 py-1 font-fira text-xs transition-colors disabled:opacity-40',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                filter === f.key
                  ? 'border-primary bg-primary-tint/10 text-primary'
                  : 'border-border text-muted hover:text-strong',
              )}
            >
              {f.label} <span className="opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {byYear.map(([year, items]) => (
          <div key={year} className="mb-6">
            <h3 className="sticky top-14 z-10 mb-1 bg-[var(--bg-color)] py-2 font-fira text-sm text-primary">
              {year}
            </h3>
            <ul className="list-none divide-y divide-[var(--border-color)] border-t border-[var(--border-color)] p-0">
              {items.map((e) => (
                <ArchiveRow key={e.slug} e={e} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
