import raw from '@/content/speaking/speaking.json';
import { speakingSchema, stripEmpty } from '@/lib/schemas';
import { endsAt, isStage } from '@/lib/engagement';

/**
 * Parsed at module scope, so a malformed entry (an em-dash, a relative video
 * URL, a time with no offset) fails `next build` instead of shipping.
 */
export const speaking = speakingSchema.parse(stripEmpty(raw));

/** Slugs must be unique: they are the anchors that /now/ and topics link to. */
{
  const seen = new Set<string>();
  for (const e of speaking.engagements) {
    if (seen.has(e.slug)) throw new Error(`Duplicate engagement slug: ${e.slug}`);
    seen.add(e.slug);
  }
  for (const t of speaking.topics) {
    if (t.basedOn && !seen.has(t.basedOn)) throw new Error(`Topic "${t.title}" points at unknown slug ${t.basedOn}`);
  }
}

/**
 * Headline numbers, derived from the data so they can never be hand-edited out
 * of step with the list underneath them. Computed at build time; the page is
 * rebuilt daily by the publish workflow, which is what keeps "upcoming" honest.
 */
export function stats(now: number) {
  const all = speaking.engagements;
  const stage = all.filter(isStage);
  const given = stage.filter((e) => endsAt(e) < now);
  const upcoming = stage.filter((e) => endsAt(e) >= now);
  const hosted = all.filter((e) => e.kind === 'hosting' || (e.kind === 'talk' && e.role?.startsWith('Co-host')));
  const hackathons = all.filter((e) => e.kind === 'jury' || e.kind === 'organizing');
  const cities = new Set(stage.map((e) => e.city));
  const firstYear = Math.min(...all.map((e) => Number(e.start.slice(0, 4))));
  return {
    given: given.length,
    upcoming: upcoming.length,
    hosted: hosted.length,
    hackathons: hackathons.length,
    cities: cities.size,
    since: firstYear,
  };
}
