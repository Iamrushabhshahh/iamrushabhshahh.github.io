import type { Metadata } from 'next';
import { GitPullRequest, ExternalLink } from 'lucide-react';
import upstream from '@/content/contributions/upstream.json';
import k8sHindi from '@/content/contributions/kubernetes-hindi.json';
import { contributionSchema, type Contribution } from '@/lib/schemas';
import { SITE_URL } from '@/lib/site';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

/**
 * Upstream contributions only.
 *
 * The GitHub API reports 355 merged PRs for this account, but 319 of them are
 * `orocorp/*`, the employer's private repositories. Publishing those would leak
 * internal repo names, ENG ticket IDs and deployment architecture, so the Zod
 * schema rejects any `orocorp/` project outright rather than relying on nobody
 * pasting one in later.
 *
 * Open PRs are labelled open. A localization series that is still in review is a
 * stronger signal than a padded merged count, but only if the state is honest:
 * a reviewer checking one link and finding an open PR described as merged
 * discards the whole page.
 */

const TITLE = 'Open source contributions · Rushabh Shah';
const DESCRIPTION =
  'Upstream pull requests to Kubernetes, eBPF, Helm, Docker and Kusion, including an ongoing Hindi localization series for the Kubernetes documentation.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contributions/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/contributions/` },
};

const all: Contribution[] = [...upstream, ...k8sHindi].map((c) => contributionSchema.parse(c));

const merged = all.filter((c) => c.state === 'merged');
const open = all.filter((c) => c.state === 'open');
const projects = new Set(all.map((c) => c.project));
const translations = all.filter((c) => c.type === 'translation');

const STATE_TONE: Record<Contribution['state'], string> = {
  merged: 'var(--accent-purple)',
  open: 'var(--green-color)',
  closed: 'var(--muted-color)',
};

function ContributionRow({ c }: { c: Contribution }) {
  return (
    <li className="flex flex-col gap-2 border-b border-[var(--border-color)] py-5 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2 py-0.5 font-fira text-[0.7rem]"
          style={{ color: STATE_TONE[c.state], backgroundColor: 'rgba(var(--primary-rgb),0.08)' }}
        >
          {c.state}
        </span>
        <span className="rounded-full bg-primary-tint/10 px-2 py-0.5 font-fira text-[0.7rem] text-primary">
          {c.type}
        </span>
        <a
          href={c.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-fira text-sm text-strong hover:text-primary"
        >
          {c.project}
          <span className="text-muted">#{c.prNumber}</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
        {c.mergedAt && (
          <time dateTime={c.mergedAt} className="font-fira text-xs text-muted">
            merged {new Date(c.mergedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </time>
        )}
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-body">{c.impactSummary}</p>
      {c.liveUrl && (
        <a
          href={c.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-fira text-xs text-primary hover:underline"
        >
          See it live: {c.liveUrl.replace('https://', '')}
        </a>
      )}
    </li>
  );
}

export default function ContributionsPage() {
  const stats = [
    { value: String(merged.length), label: 'Merged upstream' },
    { value: String(projects.size), label: 'Projects' },
    { value: String(translations.length), label: 'Localization PRs' },
    { value: '178', label: 'CNCF DevStats score' },
  ];

  return (
    <main id="main" className="container mx-auto px-6 py-16">
      <ItemPageSchema
        path="/contributions/"
        name={TITLE}
        description={DESCRIPTION}
        breadcrumb={[
          { name: 'Home', path: '/' },
          { name: 'Contributions', path: '/contributions/' },
        ]}
      />

      <header className="mb-12 max-w-3xl">
        <p className="mb-3 font-fira text-xs uppercase tracking-wider text-primary">
          <GitPullRequest aria-hidden="true" className="mr-2 inline h-3.5 w-3.5" />
          Contributions
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          Upstream work, with the state shown honestly
        </h1>
        <p className="text-base leading-relaxed text-body">
          Every row links to the pull request. Open ones are labelled open. My employer work is
          deliberately excluded: those repositories are private and their names alone would say more
          about our architecture than I am willing to publish.
        </p>
      </header>

      <dl className="mb-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5"
          >
            <dt className="font-fira text-xs uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className="mt-2 font-fira text-3xl font-bold text-primary">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="localization" className="mb-14">
        <h2 id="localization" className="mb-2 text-2xl font-bold text-strong">
          Hindi localization
        </h2>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-body">
          Most cloud native documentation assumes fluent English, which quietly excludes a large
          share of the engineers who most need it. This is the part of my open source work I care
          about most, and it is slow: terminology for kernel and scheduler concepts often has no
          settled Hindi equivalent, so each page involves choosing one and staying consistent with
          it.
        </p>
        <ul className="list-none p-0">
          {translations.map((c) => (
            <ContributionRow key={c.prUrl} c={c} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="code-docs">
        <h2 id="code-docs" className="mb-6 text-2xl font-bold text-strong">
          Code and documentation
        </h2>
        <ul className="list-none p-0">
          {all
            .filter((c) => c.type !== 'translation')
            .map((c) => (
              <ContributionRow key={c.prUrl} c={c} />
            ))}
        </ul>
      </section>

      <p className="mt-12 font-fira text-xs text-muted">
        {open.length} of these are still open and under review.
      </p>
    </main>
  );
}
