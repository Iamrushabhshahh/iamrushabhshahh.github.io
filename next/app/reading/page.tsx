import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { bookList, fmtDay } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';
import { EmptyShelf, ShelfHeader, ShelfItem, ShelfSection } from '@/components/journal/Shelf';

const TITLE = 'Reading';
const DESCRIPTION = 'Books Rushabh Shah is reading, has finished, and has queued up next, with short notes on each.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/reading/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/reading/` },
  // An empty shelf is a thin page. Keep it out of the index until it has books.
  ...(bookList.length === 0 ? { robots: { index: false, follow: true } } : {}),
};

const byFinished = (a: { finished?: string }, b: { finished?: string }) => (b.finished ?? '').localeCompare(a.finished ?? '');

export default function ReadingPage() {
  const reading = bookList.filter((b) => b.status === 'reading');
  const finished = bookList.filter((b) => b.status === 'finished').sort(byFinished);
  const queued = bookList.filter((b) => b.status === 'queued');

  return (
    <SiteShell active="now">
      <main id="main" className="container mx-auto px-6 py-16">
        <ShelfHeader title={TITLE} intro="What I am reading, what I finished, and what is next. Short notes, honest ratings." />
        {bookList.length === 0 && <EmptyShelf what="books" />}
        <ShelfSection id="reading-now" title="Reading now" empty={reading.length === 0}>
          {reading.map((b) => (
            <ShelfItem key={b.slug} title={b.title} meta={`${b.author}${b.started ? ` · started ${fmtDay(b.started)}` : ''}`} link={b.link} html={b.body} />
          ))}
        </ShelfSection>
        <ShelfSection id="finished" title="Finished" empty={finished.length === 0}>
          {finished.map((b) => (
            <ShelfItem key={b.slug} title={b.title} meta={`${b.author}${b.finished ? ` · ${fmtDay(b.finished)}` : ''}`} rating={b.rating} link={b.link} html={b.body} />
          ))}
        </ShelfSection>
        <ShelfSection id="queued" title="Up next" empty={queued.length === 0}>
          {queued.map((b) => (
            <ShelfItem key={b.slug} title={b.title} meta={b.author} link={b.link} />
          ))}
        </ShelfSection>
      </main>
    </SiteShell>
  );
}
