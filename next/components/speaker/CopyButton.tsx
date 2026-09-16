'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Copy-to-clipboard with a real fallback.
 *
 * navigator.clipboard is undefined on a non-secure origin and can reject when
 * the document is not focused, so the execCommand path is not legacy cruft, it
 * is the path that actually runs in those cases. If both fail the button says
 * so rather than showing a success state for a copy that did not happen.
 *
 * The status is announced via aria-live so a screen reader user gets the same
 * confirmation a sighted user gets from the icon swap.
 */
export function CopyButton({
  value,
  label = 'Copy',
  className,
  onCopied,
}: {
  value: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(async () => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('idle'), 2000);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setState('copied');
        onCopied?.();
        return reset();
      }
      throw new Error('clipboard API unavailable');
    } catch {
      // Fallback: off-screen textarea + execCommand. Still the only thing that
      // works on http:// origins and in some in-app browsers.
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        setState(ok ? 'copied' : 'failed');
        if (ok) onCopied?.();
      } catch {
        setState('failed');
      }
      reset();
    }
  }, [value, onCopied]);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-[var(--border-color)]',
          'px-3 py-1.5 font-fira text-xs text-body transition-colors',
          'hover:border-primary hover:text-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          className,
        )}
      >
        {state === 'copied' ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--green-color)]" />
        ) : (
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press Ctrl+C' : label}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed, select the text and press Control C' : ''}
      </span>
    </>
  );
}

export default CopyButton;
