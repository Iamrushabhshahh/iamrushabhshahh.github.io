'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { bios } from '@/lib/site';
import { CopyButton } from './CopyButton';
import { cn } from '@/lib/utils';

const LENGTHS = ['50', '100', '250'] as const;
type Length = (typeof LENGTHS)[number];

const wordCount = (s: string) => s.trim().split(/\s+/).length;

/**
 * Pre-approved bios at three lengths.
 *
 * Organisers ask for a specific word count because their programme template has
 * a fixed box. So the actual word count is printed next to each tab rather than
 * just the nominal label: if an edit drifts the 100-word bio to 112, the person
 * copying it can see that before it breaks their layout.
 *
 * Radix Tabs is used for real roving-tabindex keyboard behaviour (arrow keys,
 * Home/End) rather than a hand-rolled button row that only works with a mouse.
 */
export function BioSelector({ className }: { className?: string }) {
  return (
    <Tabs.Root defaultValue="100" className={cn('w-full', className)}>
      <Tabs.List
        aria-label="Bio length"
        className="mb-4 flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3"
      >
        {LENGTHS.map((len) => (
          <Tabs.Trigger
            key={len}
            value={len}
            className={cn(
              'rounded-md px-3 py-1.5 font-fira text-xs transition-colors',
              'text-muted hover:text-strong',
              'data-[state=active]:bg-primary-tint/10 data-[state=active]:text-primary',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            {len} words
            <span className="ml-1.5 opacity-60">({wordCount(bios[Number(len) as 50 | 100 | 250])})</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {LENGTHS.map((len) => {
        const text = bios[Number(len) as 50 | 100 | 250];
        return (
          <Tabs.Content
            key={len}
            value={len}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="rounded-md border border-[var(--border-color)] bg-[var(--panel-color)] p-5">
              {text.split('\n\n').map((para, i) => (
                <p key={i} className={cn('text-sm leading-relaxed text-body', i > 0 && 'mt-4')}>
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <CopyButton value={text} label={`Copy the ${len}-word bio`} />
              <span className="font-fira text-xs text-muted">
                Plain text, ready to paste into a programme.
              </span>
            </div>
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}

export default BioSelector;
