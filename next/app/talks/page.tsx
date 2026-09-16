import type { Metadata } from 'next';
import talksRaw from '@/content/talks/talks.json';
import { talkSchema, type Talk } from '@/lib/schemas';
import { SITE_URL } from '@/lib/site';
import { TalkGrid } from '@/components/speaker/TalkGrid';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Talks · Rushabh Shah';
const DESCRIPTION =
  'Conference talks, meetups and workshops by Rushabh Shah on Kubernetes, observability and the Grafana LGTM stack, with slides and recordings where they exist.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/talks/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/talks/` },
};

const talks: Talk[] = talksRaw
  .map((t) => talkSchema.parse(t))
  .sort((a, b) => b.date.localeCompare(a.date));

export default function TalksPage() {
  return (
    <main id="main" className="container mx-auto px-6 py-16">
      <ItemPageSchema
        path="/talks/"
        name={TITLE}
        description={DESCRIPTION}
        breadcrumb={[
          { name: 'Home', path: '/' },
          { name: 'Talks', path: '/talks/' },
        ]}
      />
      <header className="mb-12 max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          Talks
        </h1>
        <p className="text-base leading-relaxed text-body">
          Where I have spoken, what about, and the recording if there is one. Organising a{' '}
          <a href="/speaker/" className="text-primary hover:underline">
            programme? The speaker kit has bios, headshots and AV requirements
          </a>
          .
        </p>
      </header>
      <TalkGrid talks={talks} />
    </main>
  );
}
