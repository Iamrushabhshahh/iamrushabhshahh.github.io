'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Github, Play, Presentation, Users, X } from 'lucide-react';
import type { Talk } from '@/lib/schemas';
import { cn } from '@/lib/utils';

/**
 * Talk archive.
 *
 * The recording uses a click-to-load facade, not a live <iframe>. A YouTube
 * embed pulls ~1.2MB and several third-party origins on first paint; with a
 * grid of talks that is the single largest thing on the page and it lands
 * directly on LCP and TBT. The facade ships a poster image and only mounts the
 * iframe after an explicit click, which is also the honest privacy behaviour:
 * no third-party cookie is set for a visitor who never plays the video.
 */

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

function VideoFacade({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youTubeId(url);

  // Not a YouTube URL (Vimeo, CNCF's own player, ...). Link out rather than
  // guessing at an embed URL that may not exist.
  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 font-fira text-xs text-primary hover:underline"
      >
        <Play aria-hidden="true" className="h-3.5 w-3.5" /> Watch the recording
      </a>
    );
  }

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play the recording of ${title}`}
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-md',
        'border border-[var(--border-color)] focus-visible:outline focus-visible:outline-2',
      )}
    >
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
      />
      <span className="absolute inset-0 grid place-items-center bg-black/35">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--panel-color)]/90">
          <Play aria-hidden="true" className="ml-0.5 h-5 w-5 text-primary" />
        </span>
      </span>
    </button>
  );
}

function SlideModal({ url, title }: { url: string; title: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 font-fira text-xs text-primary hover:underline"
        >
          <Presentation aria-hidden="true" className="h-3.5 w-3.5" /> Slides
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-4',
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <Dialog.Title className="text-sm font-bold text-strong">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close slides"
              className="rounded p-1 text-muted hover:text-strong focus-visible:outline focus-visible:outline-2"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Embedded slide deck for {title}. Opens in a dialog.
          </Dialog.Description>
          <div className="aspect-video w-full overflow-hidden rounded-md">
            <iframe
              src={url}
              title={`Slides: ${title}`}
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-fira text-xs text-primary hover:underline"
          >
            Open the deck in a new tab
          </a>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const BADGE_TONE: Record<string, string> = {
  keynote: 'var(--accent-purple)',
  lightning: 'var(--accent-orange)',
  workshop: 'var(--green-color)',
  upcoming: 'var(--green-color)',
  'cfp-submitted': 'var(--muted-color)',
};

export function TalkGrid({ talks }: { talks: Talk[] }) {
  if (talks.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--border-color)] p-6 text-sm text-muted">
        No talks published yet.
      </p>
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
      {talks.map((talk) => (
        <li
          key={talk.slug}
          className="flex flex-col gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--panel-color)] p-5"
        >
          {talk.videoUrl && <VideoFacade url={talk.videoUrl} title={talk.title} />}

          <div className="flex flex-wrap items-center gap-2">
            {talk.badges.map((b) => (
              <span
                key={b}
                className="rounded-full px-2 py-0.5 font-fira text-[0.7rem]"
                style={{
                  color: BADGE_TONE[b] ?? 'var(--primary-color)',
                  backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                }}
              >
                {b}
              </span>
            ))}
          </div>

          <h3 className="text-lg font-bold leading-snug text-strong">{talk.title}</h3>

          <p className="font-fira text-xs text-muted">
            {talk.eventName} · {talk.location} ·{' '}
            <time dateTime={talk.date}>
              {new Date(talk.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </time>
          </p>

          {talk.abstract && <p className="text-sm leading-relaxed text-body">{talk.abstract}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
            {talk.slideUrl && <SlideModal url={talk.slideUrl} title={talk.title} />}
            {talk.repoUrl && (
              <a
                href={talk.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-fira text-xs text-primary hover:underline"
              >
                <Github aria-hidden="true" className="h-3.5 w-3.5" /> Code
              </a>
            )}
            {talk.audienceSize && (
              <span className="inline-flex items-center gap-2 font-fira text-xs text-muted">
                <Users aria-hidden="true" className="h-3.5 w-3.5" /> {talk.audienceSize} attending
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TalkGrid;
