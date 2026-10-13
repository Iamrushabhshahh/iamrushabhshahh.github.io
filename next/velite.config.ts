import { defineConfig, defineCollection, s } from 'velite';

/**
 * Velite handles the markdown collections only. The structured collections
 * (speaking, certs, contributions, deals) are plain JSON imported directly and
 * validated with the Zod schemas in lib/schemas.ts, because they have no
 * markdown body and routing them through a content pipeline would buy nothing.
 *
 * Note `s.*` here is Velite's re-export of Zod with a few file-aware helpers
 * (s.slug, s.markdown), so these definitions and lib/schemas.ts share one
 * validation engine.
 *
 * Every collection here is also editable from Pages CMS (../.pages.yml). Keep
 * the two in step: a field the CMS writes but this schema rejects fails the
 * build, which is the right outcome but a confusing one from a phone.
 */

/** Same rule as lib/schemas.ts: no em-dashes or en-dashes in visitor prose. */
const prose = (max: number) =>
  s
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[—–]/.test(v), 'Em-dash or en-dash found. Use a comma or full stop.');

/** Pages CMS writes blank optional fields as "" or null. Treat both as absent. */
const blank = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null && x !== ''))
    : v;

const tag = s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Tags are lowercase kebab-case');
const rating = s.number().int().min(1).max(5).optional();
const day = s.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/**
 * Today I learned. Anything, tech or not: `area` decides which filter it sits
 * under, `tags` are free. Every entry gets its own URL, because a single
 * kubectl trick is exactly the kind of long-tail query that lands on a page.
 */
const til = defineCollection({
  name: 'TIL',
  pattern: 'til/**/*.md',
  schema: s
    .preprocess(blank, s.object({
      title: prose(120),
      slug: s.slug('til'),
      date: s.isodate(),
      area: s.enum(['tech', 'life']).default('tech'),
      tags: s.array(tag).min(1).max(5),
      takeaways: s.array(prose(240)).max(3).default([]),
      codeSnippet: s
        .object({
          lang: s.enum(['bash', 'yaml', 'go', 'promql', 'logql', 'hcl', 'dockerfile', 'sql', 'json', 'ts', 'python', 'text']),
          code: s.string(),
          caption: s.string().max(120).optional(),
        })
        .optional(),
      draft: s.boolean().default(false),
      body: s.markdown(),
      excerpt: s.excerpt({ length: 200 }),
    }))
    .transform((data) => ({ ...data, permalink: `/til/${data.slug}/` })),
});

const books = defineCollection({
  name: 'Book',
  pattern: 'reading/**/*.md',
  schema: s.preprocess(blank, s.object({
    title: prose(140),
    slug: s.slug('reading'),
    author: prose(120),
    status: s.enum(['reading', 'finished', 'queued', 'dropped']),
    started: day.optional(),
    finished: day.optional(),
    rating,
    link: s.string().url().startsWith('https://').optional(),
    tags: s.array(tag).max(5).default([]),
    body: s.markdown(),
  })),
});

const games = defineCollection({
  name: 'Game',
  pattern: 'games/**/*.md',
  schema: s.preprocess(blank, s.object({
    title: prose(140),
    slug: s.slug('games'),
    platform: prose(60),
    status: s.enum(['playing', 'finished', 'backlog', 'dropped']),
    started: day.optional(),
    finished: day.optional(),
    hours: s.number().int().positive().optional(),
    rating,
    link: s.string().url().startsWith('https://').optional(),
    body: s.markdown(),
  })),
});

/** The /now/ page header. Everything else on that page is pulled from the other collections. */
const now = defineCollection({
  name: 'Now',
  pattern: 'now.md',
  single: true,
  schema: s.preprocess(blank, s.object({
    updated: day,
    focus: s.array(prose(200)).max(6).default([]),
    body: s.markdown(),
  })),
});

export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static', base: '/static/', clean: true },
  collections: { til, books, games, now },
});
