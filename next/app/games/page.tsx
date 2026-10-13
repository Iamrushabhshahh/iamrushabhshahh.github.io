import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { fmtDay, gameList } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';
import { EmptyShelf, ShelfHeader, ShelfItem, ShelfSection } from '@/components/journal/Shelf';

const TITLE = 'Games';
const DESCRIPTION = 'What Rushabh Shah is playing, has finished, and wants to play next.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/games/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/games/` },
  ...(gameList.length === 0 ? { robots: { index: false, follow: true } } : {}),
};

export default function GamesPage() {
  const playing = gameList.filter((g) => g.status === 'playing');
  const finished = gameList
    .filter((g) => g.status === 'finished')
    .sort((a, b) => (b.finished ?? '').localeCompare(a.finished ?? ''));
  const backlog = gameList.filter((g) => g.status === 'backlog');
  const meta = (g: (typeof gameList)[number]) =>
    [g.platform, g.hours ? `${g.hours}h` : null, g.finished ? `finished ${fmtDay(g.finished)}` : null].filter(Boolean).join(' · ');

  return (
    <SiteShell active="now">
      <main id="main" className="container mx-auto px-6 py-16">
        <ShelfHeader title={TITLE} intro="The off switch. What I am playing, what I finished, and the backlog that never shrinks." />
        {gameList.length === 0 && <EmptyShelf what="games" />}
        <ShelfSection id="playing" title="Playing now" empty={playing.length === 0}>
          {playing.map((g) => (
            <ShelfItem key={g.slug} title={g.title} meta={meta(g)} link={g.link} html={g.body} />
          ))}
        </ShelfSection>
        <ShelfSection id="finished" title="Finished" empty={finished.length === 0}>
          {finished.map((g) => (
            <ShelfItem key={g.slug} title={g.title} meta={meta(g)} rating={g.rating} link={g.link} html={g.body} />
          ))}
        </ShelfSection>
        <ShelfSection id="backlog" title="Backlog" empty={backlog.length === 0}>
          {backlog.map((g) => (
            <ShelfItem key={g.slug} title={g.title} meta={g.platform} link={g.link} />
          ))}
        </ShelfSection>
      </main>
    </SiteShell>
  );
}
