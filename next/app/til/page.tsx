import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { tils } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';
import { TilList } from '@/components/journal/TilList';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'Today I learned';
const DESCRIPTION =
  'Small things Rushabh Shah learned today, one idea each. Mostly Kubernetes, observability and Linux, plus whatever else turned up.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/til/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/til/` },
};

export default function TilPage() {
  return (
    <SiteShell active="til">
      <main id="main" className="container mx-auto px-6 py-16">
        <ItemPageSchema
          path="/til/"
          name={TITLE}
          description={DESCRIPTION}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'TIL', path: '/til/' },
          ]}
        />
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 font-fira text-sm">
            <a href="/" className="text-muted hover:text-primary">
              &larr; Home
            </a>
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">{TITLE}</h1>
          <p className="text-base leading-relaxed text-body">
            One idea each, written down the day I learned it. Mostly tech, sometimes not. Longer writing lives on{' '}
            <a href="/blog/" className="text-primary hover:underline">
              the blog
            </a>
            .
          </p>
        </header>
        <TilList
          entries={tils.map(({ slug, title, date, area, tags, excerpt, permalink, takeaways }) => ({
            slug,
            title,
            date,
            area,
            tags,
            permalink,
            excerpt: takeaways[0] ?? excerpt,
          }))}
        />
      </main>
    </SiteShell>
  );
}
