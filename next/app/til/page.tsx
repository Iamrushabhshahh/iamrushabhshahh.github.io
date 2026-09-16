import type { Metadata } from 'next';
import { til } from '#content';
import { SITE_URL } from '@/lib/site';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'TIL · Rushabh Shah';
const DESCRIPTION =
  'Short things learned while running Kubernetes, Docker, Grafana and Linux in production. One idea each, a minute to read.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/til/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/til/` },
};

const CATEGORY_TONE: Record<string, string> = {
  k8s: 'var(--primary-color)',
  docker: 'var(--docker-blue)',
  grafana: 'var(--accent-orange)',
  ebpf: 'var(--green-color)',
  linux: 'var(--accent-purple)',
};

export default function TilPage() {
  const entries = [...til].sort((a, b) => b.date.localeCompare(a.date));

  return (
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
      <header className="mb-12 max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          Today I learned
        </h1>
        <p className="text-base leading-relaxed text-body">
          One idea each. Things that cost me an hour so they do not cost you one. Longer writing
          lives on <a href="/blog/" className="text-primary hover:underline">the blog</a>.
        </p>
      </header>

      <ul className="list-none space-y-6 p-0">
        {entries.map((t) => (
          <li
            key={t.slug}
            id={t.slug}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-6"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className="rounded-full px-2 py-0.5 font-fira text-[0.7rem]"
                style={{
                  color: CATEGORY_TONE[t.category] ?? 'var(--primary-color)',
                  backgroundColor: 'rgba(var(--primary-rgb),0.08)',
                }}
              >
                {t.category}
              </span>
              <time dateTime={t.date} className="font-fira text-xs text-muted">
                {new Date(t.date).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </div>

            <h2 className="mb-3 text-xl font-bold leading-snug text-strong">{t.title}</h2>

            {t.codeSnippet && (
              <figure className="mb-4">
                {t.codeSnippet.caption && (
                  <figcaption className="mb-1 font-fira text-xs text-muted">
                    {t.codeSnippet.caption}
                  </figcaption>
                )}
                <pre className="overflow-x-auto rounded-md border border-[var(--border-color)] p-4">
                  <code className={`language-${t.codeSnippet.lang} font-fira text-xs`}>
                    {t.codeSnippet.code}
                  </code>
                </pre>
              </figure>
            )}

            <ul className="list-disc space-y-1 pl-5">
              {t.takeaways.map((k) => (
                <li key={k} className="text-sm leading-relaxed text-body">
                  {k}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
