import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { speaking } from '@/lib/speaking';
import { endsAt, formatWhen, isStage, startsAt } from '@/lib/engagement';
import { certs } from '@/lib/certs';
import { bookList, fmtDay, gameList, nowPage, tils } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Now';
const DESCRIPTION =
  'What Rushabh Shah is working on, learning, reading and playing right now, and where he is speaking next.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/now/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/now/` },
};

const BUILT_AT = Date.now();

/**
 * A /now page in the nownownow.com sense. Only the focus list and the note are
 * written by hand (content/now.md). Every other block is pulled from the
 * collection that owns it, so updating a book's status or adding a TIL updates
 * this page too, and nothing here can go stale on its own.
 */
function Block({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6">
      <h2 className="mb-4 font-fira text-sm uppercase tracking-wider text-primary">{title}</h2>
      <div className="flex-1">{children}</div>
      <a href={href} className="mt-5 inline-flex items-center gap-1.5 font-fira text-xs text-primary hover:underline">
        {linkLabel} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}

const Quiet = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted">{children}</p>;

export default function NowPage() {
  const nextTalks = speaking.engagements
    .filter((e) => isStage(e) && endsAt(e) >= BUILT_AT)
    .sort((a, b) => startsAt(a) - startsAt(b))
    .slice(0, 3);
  const reading = bookList.filter((b) => b.status === 'reading');
  const playing = gameList.filter((g) => g.status === 'playing');
  const studying = certs.filter((c) => c.status === 'in-progress' || c.status === 'planned').slice(0, 3);
  const latestTils = tils.slice(0, 5);

  return (
    <SiteShell active="now">
      <main id="main" className="container mx-auto px-6 py-16">
        <ItemPageSchema
          path="/now/"
          name={TITLE}
          description={DESCRIPTION}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'Now', path: '/now/' },
          ]}
        />
        <header className="mb-12 max-w-3xl">
          <h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">What I&apos;m doing now</h1>
          <p className="font-fira text-xs text-muted">
            Updated <time dateTime={nowPage.updated}>{fmtDay(nowPage.updated)}</time> · from Ahmedabad
          </p>
        </header>

        {nowPage.focus.length > 0 && (
          <section aria-labelledby="focus" className="mb-10 max-w-3xl">
            <h2 id="focus" className="sr-only">
              Current focus
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              {nowPage.focus.map((f) => (
                <li key={f} className="text-base leading-relaxed text-body">
                  {f}
                </li>
              ))}
            </ul>
            {nowPage.body && <div className="post-prose mt-6" dangerouslySetInnerHTML={{ __html: nowPage.body }} />}
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Block title="Speaking next" href="/speaking/" linkLabel="All talks">
            {nextTalks.length === 0 ? (
              <Quiet>Nothing on the calendar right now.</Quiet>
            ) : (
              <ul className="list-none space-y-3 p-0">
                {nextTalks.map((e) => (
                  <li key={e.slug}>
                    <a href={`/speaking/#${e.slug}`} className="text-sm font-bold leading-snug text-strong hover:text-primary">
                      {e.title}
                    </a>
                    <p className="font-fira text-xs text-muted">
                      {formatWhen(e)} · {e.city}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Learned lately" href="/til/" linkLabel="Every TIL">
            {latestTils.length === 0 ? (
              <Quiet>Nothing logged yet.</Quiet>
            ) : (
              <ul className="list-none space-y-3 p-0">
                {latestTils.map((t) => (
                  <li key={t.slug}>
                    <a href={t.permalink} className="text-sm font-bold leading-snug text-strong hover:text-primary">
                      {t.title}
                    </a>
                    <p className="font-fira text-xs text-muted">{fmtDay(t.date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Studying for" href="/certs/" linkLabel="Certifications">
            {studying.length === 0 ? (
              <Quiet>No exam booked. {certs.filter((c) => c.status === 'earned').length} earned so far.</Quiet>
            ) : (
              <ul className="list-none space-y-2 p-0">
                {studying.map((c) => (
                  <li key={c.slug} className="text-sm text-strong">
                    {c.code} <span className="font-fira text-xs text-muted">· {c.status === 'in-progress' ? 'studying' : 'planned'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Reading" href="/reading/" linkLabel="The shelf">
            {reading.length === 0 ? (
              <Quiet>Between books.</Quiet>
            ) : (
              <ul className="list-none space-y-2 p-0">
                {reading.map((b) => (
                  <li key={b.slug} className="text-sm text-strong">
                    {b.title} <span className="font-fira text-xs text-muted">· {b.author}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Playing" href="/games/" linkLabel="All games">
            {playing.length === 0 ? (
              <Quiet>Nothing at the moment.</Quiet>
            ) : (
              <ul className="list-none space-y-2 p-0">
                {playing.map((g) => (
                  <li key={g.slug} className="text-sm text-strong">
                    {g.title} <span className="font-fira text-xs text-muted">· {g.platform}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <p className="mt-12 max-w-3xl text-sm text-muted">
          A <a href="https://nownownow.com/about" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">now page</a>{' '}
          lists what I am working on this month. It is updated by hand, so the date at the top tells you how fresh it is.
        </p>
      </main>
    </SiteShell>
  );
}
