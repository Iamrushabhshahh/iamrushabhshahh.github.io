import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware class joiner. `twMerge` is what stops a caller-supplied
 * `className` from losing to a component's own default when both set the same
 * property, which is the usual cause of "my override did nothing".
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Absolute URL for metadata and JSON-LD. Relative URLs are dropped by parsers. */
export const abs = (path: string, origin = 'https://rushabhshah.dev') =>
  path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
