import type { Engagement } from '@/lib/schemas';

/**
 * Pure helpers for engagements. Kept apart from lib/speaking.ts so client
 * components can import them without dragging Zod and the full data file into
 * the browser bundle.
 */

/** Kinds that put the person on a stage, as opposed to running the room. */
/** Splits `YYYY-MM[-DD]` into numbers. Day is undefined for month-only dates. */
export function ymd(iso: string): [number, number, number | undefined] {
  const [y = 1970, m = 1, d] = iso.slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

export const STAGE_KINDS: ReadonlySet<Engagement['kind']> = new Set(['talk', 'lightning', 'workshop']);

/**
 * The last moment an engagement can still be called upcoming: the end of its
 * final day, in UTC+14, so nothing flips to "past" while it is still that day
 * anywhere on Earth. Month-only dates run to the end of the month.
 */
export function endsAt(e: Engagement): number {
  const last = e.endDate ?? e.start.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(last)) {
    const [y, m] = ymd(last);
    return Date.UTC(y, m, 1) - 14 * 3600_000; // first of next month, minus the offset
  }
  return Date.parse(`${last}T23:59:59+14:00`);
}

/** Sort key. Month-only dates sort as the first of the month. */
export const startsAt = (e: Engagement) =>
  Date.parse(e.start.length === 7 ? `${e.start}-01` : e.start.length === 10 ? `${e.start}T00:00:00Z` : e.start);

export const isStage = (e: Engagement) => STAGE_KINDS.has(e.kind);

/** Human date in the event's own calendar day, never shifted by the reader's timezone. */
export function formatWhen(e: Engagement): string {
  const day = (iso: string, withYear = true) => {
    const [y, m, d] = ymd(iso);
    const date = new Date(Date.UTC(y, m - 1, d ?? 1));
    return date.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      ...(d ? { day: 'numeric' } : {}),
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  };
  if (e.endDate && e.endDate !== e.start.slice(0, 10)) {
    const sameMonth = e.endDate.slice(0, 7) === e.start.slice(0, 7);
    return sameMonth
      ? `${Number(e.start.slice(8, 10))}-${day(e.endDate)}`
      : `${day(e.start, false)} to ${day(e.endDate)}`;
  }
  return day(e.start);
}

/** Local start time as the venue sees it, e.g. "12:25 MST". Only for timed entries. */
export function formatLocalTime(e: Engagement): string | null {
  const m = e.start.match(/T(\d{2}):(\d{2}).*([+-]\d{2}):(\d{2})$/);
  if (!m) return null;
  const zone: Record<string, string> = { '-07': 'MST', '+09': 'JST', '+02': 'CEST', '+05': 'IST' };
  const off = m[3] ?? '';
  return `${m[1]}:${m[2]} ${zone[off] ?? `UTC${off}`}`;
}

const toCalStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Google Calendar template link. Timed entries only: an all-day guess is worse than none. */
export function googleCalendarUrl(e: Engagement): string | null {
  if (e.start.length <= 10 || !e.durationMinutes) return null;
  const start = Date.parse(e.start);
  const end = start + e.durationMinutes * 60_000;
  const where = [e.venue, e.city, e.country].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${e.title} (${e.event})`,
    dates: `${toCalStamp(start)}/${toCalStamp(end)}`,
    location: where,
    details: [e.abstract, e.links.session].filter(Boolean).join('\n\n'),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Same event as an .ics data URI, for Apple Calendar and Outlook users. */
export function icsDataUri(e: Engagement): string | null {
  if (e.start.length <= 10 || !e.durationMinutes) return null;
  const start = Date.parse(e.start);
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//rushabhshah.dev//speaking//EN',
    'BEGIN:VEVENT',
    `UID:${e.slug}@rushabhshah.dev`,
    `DTSTAMP:${toCalStamp(start)}`,
    `DTSTART:${toCalStamp(start)}`,
    `DTEND:${toCalStamp(start + e.durationMinutes * 60_000)}`,
    `SUMMARY:${esc(`${e.title} (${e.event})`)}`,
    `LOCATION:${esc([e.venue, e.city, e.country].filter(Boolean).join(', '))}`,
    ...(e.links.session ? [`URL:${e.links.session}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export const KIND_LABEL: Record<Engagement['kind'], string> = {
  talk: 'Talk',
  lightning: 'Lightning talk',
  workshop: 'Workshop',
  jury: 'Hackathon jury',
  organizing: 'Organizing',
  hosting: 'Hosted meetup',
  volunteer: 'Volunteer',
  booth: 'Booth',
};

/** Filter groups for the archive. Each kind belongs to exactly one. */
export const FILTERS = [
  { key: 'all', label: 'Everything', kinds: null },
  { key: 'stage', label: 'Talks', kinds: ['talk', 'lightning', 'workshop'] },
  { key: 'hackathons', label: 'Hackathons', kinds: ['jury', 'organizing'] },
  { key: 'hosted', label: 'Meetups hosted', kinds: ['hosting'] },
  { key: 'volunteer', label: 'Volunteering', kinds: ['volunteer', 'booth'] },
] as const;

export type FilterKey = (typeof FILTERS)[number]['key'];

