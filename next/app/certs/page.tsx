import type { Metadata } from 'next';
import { BadgeCheck, CircleDashed, Hourglass } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { certs } from '@/lib/certs';
import { fmtDay } from '@/lib/journal';
import { SiteShell } from '@/components/site/SiteShell';

const TITLE = 'Certifications';
const DESCRIPTION =
  'Certifications Rushabh Shah holds, each linked to the issuer for verification, plus the ones in progress and planned next.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/certs/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/certs/` },
};

const target = (t?: string) =>
  t
    ? new Date(`${t.length === 7 ? `${t}-01` : t}T00:00:00Z`).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;

export default function CertsPage() {
  const earned = certs
    .filter((c) => c.status === 'earned')
    .sort((a, b) => (b.earnedOn ?? '').localeCompare(a.earnedOn ?? ''));
  const inProgress = certs.filter((c) => c.status === 'in-progress');
  const planned = certs.filter((c) => c.status === 'planned');
  const hasLf = [...inProgress, ...planned].some((c) => c.issuer === 'The Linux Foundation');

  return (
    <SiteShell active="now">
      <main id="main" className="container mx-auto px-6 py-16">
        <header className="mb-12 max-w-3xl">
          <p className="mb-3 font-fira text-sm">
            <a href="/now/" className="text-muted hover:text-primary">
              &larr; Now
            </a>
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">{TITLE}</h1>
          <p className="text-base leading-relaxed text-body">
            What I hold, what I am studying for, and what is next. Every earned one links to the issuer, so you can check
            it there rather than take my word for it.
          </p>
        </header>

        <section aria-labelledby="earned" className="mb-14">
          <h2 id="earned" className="mb-5 font-fira text-sm uppercase tracking-wider text-primary">
            Earned
          </h2>
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {earned.map((c) => (
              <li key={c.slug} className="flex gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
                <BadgeCheck aria-hidden="true" className="h-6 w-6 flex-shrink-0 text-green" />
                <div>
                  <p className="font-bold leading-snug text-strong">{c.title}</p>
                  <p className="mt-1 font-fira text-xs text-muted">
                    {c.issuer}
                    {c.earnedOn && ` · ${fmtDay(c.earnedOn)}`}
                  </p>
                  {c.proofUrl && (
                    <a href={c.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-fira text-xs text-primary hover:underline">
                      {c.proofUrl.includes('credly.com') ? 'Verify on Credly' : 'Verify with the issuer'}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {(inProgress.length > 0 || planned.length > 0) && (
          <section aria-labelledby="next" className="mb-14">
            <h2 id="next" className="mb-5 font-fira text-sm uppercase tracking-wider text-primary">
              Working towards
            </h2>
            <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
              {[...inProgress, ...planned].map((c) => {
                const Icon = c.status === 'in-progress' ? Hourglass : CircleDashed;
                return (
                  <li key={c.slug} className="flex gap-4 rounded-lg border border-dashed border-[var(--border-color)] p-5">
                    <Icon aria-hidden="true" className="h-6 w-6 flex-shrink-0 text-muted" />
                    <div>
                      <p className="font-bold leading-snug text-strong">{c.title}</p>
                      <p className="mt-1 font-fira text-xs text-muted">
                        {c.status === 'in-progress' ? 'Studying now' : 'Planned'}
                        {target(c.target) && ` · aiming for ${target(c.target)}`}
                      </p>
                      {c.why && <p className="mt-2 text-sm leading-relaxed text-body">{c.why}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {hasLf && (
          <p className="max-w-3xl text-sm text-muted">
            Taking a Linux Foundation exam yourself? Code RUSHABH30 takes 30% off.{' '}
            <a href="/linux-foundation-coupon/" className="text-primary hover:underline">
              Details and current prices
            </a>
            .
          </p>
        )}
      </main>
    </SiteShell>
  );
}
