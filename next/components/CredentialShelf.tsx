'use client';

import { useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { credentials, type Credential } from '@/lib/site';
import { cn } from '@/lib/utils';

/**
 * The credential shelf.
 *
 * Design constraint that drove this: a reviewer assessing an Ambassador or
 * Captain-renewal application does not want a badge wall, they want to click
 * through to the issuer and confirm. So every chip is a link to `proofUrl` on
 * the issuer's own domain. A credential with no external proof URL does not
 * belong on the shelf.
 *
 * Interaction is hover/focus to expand detail, with no layout shift: the detail
 * row is always in the DOM at full height and only its opacity changes. Animating
 * height here would push the page around during CLS measurement.
 */

function CredentialChip({ credential }: { credential: Credential }) {
  const [active, setActive] = useState(false);
  const detailId = useId();

  return (
    <li className="relative">
      <a
        href={credential.proofUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={detailId}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className={cn(
          'group flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors',
          'border-[var(--border-color)] bg-[var(--panel-color)]',
          'hover:border-[color:var(--accent)] focus-visible:border-[color:var(--accent)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
        style={{ ['--accent' as string]: credential.tint }}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            {credential.icon && (
              <img
                src={credential.icon}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                decoding="async"
                className="h-5 w-5"
              />
            )}
            <span className="font-fira text-sm font-bold text-[color:var(--accent)]">
              {credential.label}
            </span>
          </span>
          <ExternalLink
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-strong"
          />
        </span>

        <span className="font-fira text-xs text-muted">
          {credential.issuer} · {credential.year}
        </span>

        <span
          id={detailId}
          className={cn(
            'text-xs leading-relaxed text-body transition-opacity duration-200',
            active ? 'opacity-100' : 'opacity-70',
          )}
        >
          {credential.detail}
        </span>
      </a>
    </li>
  );
}

export function CredentialShelf({
  className,
  heading = 'Verified credentials',
}: {
  className?: string;
  heading?: string;
}) {
  return (
    <section aria-labelledby="credential-shelf-heading" className={cn('w-full', className)}>
      <h2
        id="credential-shelf-heading"
        className="mb-4 font-fira text-xs uppercase tracking-wider text-muted"
      >
        {heading}
      </h2>
      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {credentials.map((c) => (
          <CredentialChip key={c.id} credential={c} />
        ))}
      </ul>
      <p className="mt-3 font-fira text-xs text-muted">
        Every chip links to the issuing organisation, not to this site.
      </p>
    </section>
  );
}

export default CredentialShelf;
