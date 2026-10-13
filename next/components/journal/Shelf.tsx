import { Star } from 'lucide-react';

/** Shared bits for the reading and games pages. Server-only, no client JS. */

export function Rating({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className="h-3.5 w-3.5"
          style={{ color: i < value ? 'var(--accent-orange)' : 'var(--border-color)' }}
          fill={i < value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export function ShelfHeader({ title, intro }: { title: string; intro: React.ReactNode }) {
  return (
    <header className="mb-12 max-w-3xl">
      <p className="mb-3 font-fira text-sm">
        <a href="/now/" className="text-muted hover:text-primary">
          <span className="text-green">$</span> cd ../now
        </a>
      </p>
      <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">{title}</h1>
      <p className="text-base leading-relaxed text-body">{intro}</p>
    </header>
  );
}

export function ShelfSection({ id, title, children, empty }: { id: string; title: string; children: React.ReactNode; empty?: boolean }) {
  if (empty) return null;
  return (
    <section aria-labelledby={id} className="mb-14">
      <h2 id={id} className="mb-5 font-fira text-sm uppercase tracking-wider text-primary">
        {title}
      </h2>
      <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">{children}</ul>
    </section>
  );
}

export function ShelfItem({
  title,
  meta,
  rating,
  link,
  html,
}: {
  title: string;
  meta: string;
  rating?: number;
  link?: string;
  html?: string;
}) {
  return (
    <li className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
      <h3 className="font-bold leading-snug text-strong">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
            {title}
          </a>
        ) : (
          title
        )}
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-3 font-fira text-xs text-muted">
        <span>{meta}</span>
        <Rating value={rating} />
      </p>
      {html && <div className="post-prose mt-3 text-sm" dangerouslySetInnerHTML={{ __html: html }} />}
    </li>
  );
}

export function EmptyShelf({ what }: { what: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--border-color)] p-6 text-sm text-muted">
      No {what} logged yet. Check back soon.
    </p>
  );
}
