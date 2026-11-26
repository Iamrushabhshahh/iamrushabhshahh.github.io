import { NextResponse } from 'next/server';
import { speaking } from '@/lib/speaking';

/**
 * Static feed for external consumers (the GitHub profile README's sync
 * workflow). Prerendered to a flat file at export time, the same mechanism
 * Next uses for app/sitemap.ts, so it needs no server runtime.
 */
export const dynamic = 'force-static';

const TALK_KINDS = new Set(['talk', 'lightning', 'workshop']);

export async function GET() {
  const talks = speaking.engagements
    .filter((e) => TALK_KINDS.has(e.kind))
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      kind: e.kind,
      event: e.event,
      start: e.start,
      endDate: e.endDate ?? null,
      city: e.city,
      country: e.country,
      coSpeakers: e.coSpeakers,
      session: e.links.session ?? null,
      video: e.links.video ?? null,
    }));

  return NextResponse.json(talks);
}
