import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Research · Rushabh Shah';
const DESCRIPTION =
  'Longer-form analysis: incident postmortems, benchmark work and deep dives into how cloud native systems fail.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/research/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/research/` },
};

/**
 * Seeded from posts already published by the generator that are research-shaped
 * rather than tutorial-shaped. When the blog moves onto this pipeline these come
 * from the Post collection filtered on `isResearchPaper`, and this array goes
 * away. Until then it is a curated index, not a second copy: each entry links to
 * the canonical /blog/ URL and nothing is duplicated.
 */
const ENTRIES = [
  {
    title: 'A hostname that never existed took Redis and Postgres down with it',
    href: '/blog/dns-storm-eai-again/',
    date: '2026-09-03',
    kind: 'Incident postmortem',
    summary:
      'A logging misconfiguration pointed two dozen services at a DNS name nobody ever created. They retried it 46 times a second and burnt 28 percent of the resolver budget before anything looked wrong.',
  },
  {
    title: 'My CNCF DevStats score is 178, and now I cannot stop checking it',
    href: '/blog/cncf-devstats-score/',
    date: '2026-08-20',
    kind: 'Analysis',
    summary:
      'What the CNCF DevStats contribution score is actually made of, why the number is not a PR count, and how to check your own.',
  },
  {
    title: 'The real cost of the Kubestronaut path',
    href: '/blog/kubestronaut-path-cost/',
    date: '2026-08-15',
    kind: 'Cost analysis',
    summary:
      'Every exam on the Kubestronaut path priced out, including retakes and the renewals nobody budgets for.',
  },
];

export default function ResearchPage() {
  return (
    <main id="main" className="container mx-auto px-6 py-16">
      <ItemPageSchema
        path="/research/"
        name={TITLE}
        description={DESCRIPTION}
        breadcrumb={[
          { name: 'Home', path: '/' },
          { name: 'Research', path: '/research/' },
        ]}
      />
      <header className="mb-12 max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          Research
        </h1>
        <p className="text-base leading-relaxed text-body">
          The longer pieces: failures I debugged and then wrote up properly, and analysis that took
          more than an afternoon. Everything here also appears on the blog, which stays the
          canonical location.
        </p>
      </header>

      <ul className="list-none space-y-6 p-0">
        {ENTRIES.map((e) => (
          <li
            key={e.href}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6"
          >
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary-tint/10 px-2 py-0.5 font-fira text-[0.7rem] text-primary">
                {e.kind}
              </span>
              <time dateTime={e.date} className="font-fira text-xs text-muted">
                {new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </time>
            </div>
            <h2 className="mb-2 text-xl font-bold leading-snug text-strong">
              <a href={e.href} className="hover:text-primary">
                {e.title}
              </a>
            </h2>
            <p className="text-sm leading-relaxed text-body">{e.summary}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
