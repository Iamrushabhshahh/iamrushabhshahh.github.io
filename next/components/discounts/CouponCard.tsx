'use client';

import { useCallback, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Copy } from 'lucide-react';
import { discountedPrice, type Deal } from '@/lib/schemas';
import { cn } from '@/lib/utils';

/**
 * Copy the code, then open the offer.
 *
 * Two behaviours worth keeping:
 *
 * 1. The link is a /go/ short link, never a raw awin1.com URL. Raw Awin URLs in
 *    page source get scraped and reused by competitors, and re-pointing them
 *    would mean rebuilding every page that embeds one. The schema rejects them.
 *
 * 2. The new tab is opened from inside the click handler, synchronously, BEFORE
 *    awaiting the clipboard write. Popup blockers only trust a window.open that
 *    happens in the same task as the user gesture; opening it in a .then() after
 *    an await gets blocked in Safari and Firefox.
 *
 * Analytics reuse the GoatCounter data attributes the rest of the site already
 * uses, so no second analytics vendor is introduced.
 */
export function CouponCard({ deal, studyGuideTitle }: { deal: Deal; studyGuideTitle?: string }) {
  const [copied, setCopied] = useState(false);
  const price = discountedPrice(deal);
  const saving = deal.defaultPrice - price;

  const handle = useCallback(() => {
    // Synchronous, same task as the gesture. Do not move below the await.
    const win = window.open(deal.affiliateUrl, '_blank', 'noopener,noreferrer');

    void (async () => {
      try {
        await navigator.clipboard?.writeText(deal.promoCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard denied. The code is visible in the DOM, so the user can
        // still select it. Nothing to recover.
      }
    })();

    if (!win) {
      // Popup blocked despite the sync call. Fall back to same-tab navigation
      // rather than silently doing nothing.
      window.location.href = deal.affiliateUrl;
    }
  }, [deal.affiliateUrl, deal.promoCode]);

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
      <header>
        <h3 className="text-base font-bold leading-snug text-strong">{deal.examName}</h3>
        <p className="mt-1 font-fira text-xs text-muted">
          {deal.provider === 'FinOps' ? 'FinOps Foundation' : 'The Linux Foundation'}
        </p>
      </header>

      <p className="flex items-baseline gap-2">
        <span className="font-fira text-2xl font-bold text-strong">${price}</span>
        <s className="font-fira text-sm text-muted">${deal.defaultPrice}</s>
        <span className="font-fira text-xs text-[color:var(--green-color)]">
          save ${saving}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded border border-dashed border-[var(--border-color)] px-3 py-1.5 font-fira text-sm text-primary">
          {deal.promoCode}
        </code>
        <button
          type="button"
          onClick={handle}
          data-goatcounter-click={`cta-copy-${deal.promoCode.toLowerCase()}`}
          data-goatcounter-title={`Copy ${deal.promoCode} · ${deal.examName}`}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-fira text-xs transition-colors',
            'bg-primary-tint/10 text-primary hover:bg-primary-tint/20',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          )}
        >
          {copied ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied, tab opened' : 'Copy code and open'}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>

      {deal.studyGuideSlug && (
        <a
          href={`/blog/${deal.studyGuideSlug}/`}
          className="mt-auto inline-flex items-center gap-2 font-fira text-xs text-primary hover:underline"
        >
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          {studyGuideTitle ?? 'Read the study guide first'}
        </a>
      )}

      <p className="font-fira text-[0.7rem] leading-relaxed text-muted">
        Affiliate link. I earn a commission at no extra cost to you.
      </p>
    </article>
  );
}

export default CouponCard;
