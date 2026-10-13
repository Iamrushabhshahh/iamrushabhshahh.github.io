import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PERSON_ID, SITE_URL } from '@/lib/site';
import { fmtDay, tils } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';
import { ItemPageSchema } from '@/components/SEO/StructuredData';
import { InlineCode } from '@/components/journal/InlineCode';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tils.map((t) => ({ slug: t.slug }));
}

const find = async (params: Props['params']) => {
  const { slug } = await params;
  return tils.find((t) => t.slug === slug);
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await find(params);
  if (!t) return {};
  const description = (t.takeaways[0] ?? t.excerpt).replace(/`/g, '');
  const url = `${SITE_URL}${t.permalink}`;
  return {
    title: `TIL: ${t.title}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: t.title, description, url, type: 'article', publishedTime: t.date },
  };
}

export default async function TilEntry({ params }: Props) {
  const t = await find(params);
  if (!t) notFound();
  const idx = tils.indexOf(t);
  const newer = tils[idx - 1];
  const older = tils[idx + 1];

  return (
    <SiteShell active="til">
      <main id="main" className="container mx-auto px-6 py-16">
        <ItemPageSchema
          path={t.permalink}
          name={t.title}
          description={(t.takeaways[0] ?? t.excerpt).replace(/`/g, '')}
          breadcrumb={[
            { name: 'Home', path: '/' },
            { name: 'TIL', path: '/til/' },
            { name: t.title, path: t.permalink },
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': t.area === 'tech' ? 'TechArticle' : 'BlogPosting',
              headline: t.title,
              datePublished: t.date,
              author: { '@id': PERSON_ID },
              mainEntityOfPage: `${SITE_URL}${t.permalink}`,
              keywords: t.tags.join(', '),
            }).replace(/</g, '\\u003c'),
          }}
        />
        <article className="max-w-3xl">
          <p className="mb-8 font-fira text-sm">
            <a href="/til/" className="text-muted hover:text-primary">
              <span className="text-green">$</span> cd ../til
            </a>
          </p>
          <header className="mb-8">
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-strong md:text-4xl">{t.title}</h1>
            <p className="font-fira text-sm text-muted">
              <time dateTime={t.date}>{fmtDay(t.date)}</time>
              {' · '}
              {t.tags.map((tag) => `#${tag}`).join(' ')}
            </p>
          </header>

          {t.codeSnippet && (
            <figure className="mb-6">
              {t.codeSnippet.caption && (
                <figcaption className="mb-1 font-fira text-xs text-muted">{t.codeSnippet.caption}</figcaption>
              )}
              <pre className="overflow-x-auto rounded-md border border-[var(--border-color)] p-4">
                <code className={`language-${t.codeSnippet.lang} font-fira text-xs`}>{t.codeSnippet.code}</code>
              </pre>
            </figure>
          )}

          {t.takeaways.length > 0 && (
            <ul className="mb-6 list-disc space-y-1 pl-5">
              {t.takeaways.map((k) => (
                <li key={k} className="text-sm leading-relaxed text-body">
                  <InlineCode text={k} />
                </li>
              ))}
            </ul>
          )}

          <div className="post-prose" dangerouslySetInnerHTML={{ __html: t.body }} />

          <nav aria-label="More TILs" className="mt-12 flex flex-wrap justify-between gap-4 border-t border-[var(--border-color)] pt-6 font-fira text-xs">
            {older ? (
              <a href={older.permalink} className="text-muted hover:text-primary">
                ← {older.title}
              </a>
            ) : (
              <span />
            )}
            {newer && (
              <a href={newer.permalink} className="text-muted hover:text-primary">
                {newer.title} →
              </a>
            )}
          </nav>
        </article>
      </main>
    </SiteShell>
  );
}
