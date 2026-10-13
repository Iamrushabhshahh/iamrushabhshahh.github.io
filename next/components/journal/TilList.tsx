'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { InlineCode } from './InlineCode';

export interface TilCard {
  slug: string;
  title: string;
  date: string;
  area: 'tech' | 'life';
  tags: string[];
  excerpt: string;
  permalink: string;
}

const AREAS = [
  { key: 'all', label: 'Everything' },
  { key: 'tech', label: 'Tech' },
  { key: 'life', label: 'Everything else' },
] as const;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * Filterable TIL index. The full entries render on their own pages; this list
 * only carries what a scan needs, so the client payload stays small however
 * long the log gets.
 */
export function TilList({ entries }: { entries: TilCard[] }) {
  const [area, setArea] = useState<(typeof AREAS)[number]['key']>('all');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) if (area === 'all' || e.area === area) for (const t of e.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries, area]);

  const shown = entries.filter((e) => (area === 'all' || e.area === area) && (!tag || e.tags.includes(tag)));

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 font-fira text-xs transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      active ? 'border-primary bg-primary-tint/10 text-primary' : 'border-border text-muted hover:text-strong',
    );

  return (
    <>
      <div role="group" aria-label="Filter by area" className="mb-3 flex flex-wrap gap-2">
        {AREAS.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-pressed={area === a.key}
            onClick={() => {
              setArea(a.key);
              setTag(null);
            }}
            className={chip(area === a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {tags.length > 1 && (
        <div role="group" aria-label="Filter by tag" className="mb-8 flex flex-wrap gap-2">
          {tags.map(([t, n]) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)}>
              #{t} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border-color)] p-6 text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border-color)] border-t border-[var(--border-color)] p-0">
          {shown.map((e) => (
            <li key={e.slug} className="grid gap-1 py-5 sm:grid-cols-[120px_1fr] sm:gap-6">
              <time dateTime={e.date} className="font-fira text-xs text-muted sm:pt-1">
                {fmt(e.date)}
              </time>
              <div>
                <a href={e.permalink} className="text-lg font-bold leading-snug text-strong hover:text-primary">
                  {e.title}
                </a>
                {e.excerpt && (
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    <InlineCode text={e.excerpt} />
                  </p>
                )}
                <p className="mt-2 font-fira text-xs text-muted">
                  {e.area === 'life' ? 'life · ' : ''}
                  {e.tags.map((t) => `#${t}`).join(' ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
