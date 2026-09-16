import { z } from 'zod';

/**
 * Phase 2 content model.
 *
 * Every schema here is a *validation gate*, not documentation. The existing
 * pipeline has no frontmatter validation at all, which is how a post can ship
 * with a missing `description` and lose its meta tag silently. These throw at
 * build time instead.
 *
 * Two house rules are enforced mechanically rather than trusted to reviewers:
 *   - `noEmDash`  : em-dashes read as machine-written and are banned in prose
 *                   that ships to visitors.
 *   - `httpsUrl`  : every outbound URL must be absolute https, because these
 *                   feed JSON-LD where a relative URL is silently dropped by
 *                   Google's parser.
 */

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

const EM_DASH = /[—–]/;

/** Prose that reaches a visitor. Rejects em-dashes and en-dashes. */
const prose = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !EM_DASH.test(s), {
      message:
        'Em-dash or en-dash found. Site copy uses commas, full stops or parentheses instead.',
    });

const httpsUrl = z.string().url().startsWith('https://', {
  message: 'Must be an absolute https URL. Relative URLs are dropped from JSON-LD.',
});

/** Site-internal path. Leading slash, trailing slash, no origin. */
const sitePath = z
  .string()
  .regex(/^\/[a-z0-9/-]*\/$/, 'Must be a root-relative path with a trailing slash, e.g. /blog/post/');

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase kebab-case only');

/** Accepts `2026-09-16` or `2026-09-16 09:00`, normalises to an ISO instant. */
const publishDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Unparseable date')
  .transform((s) => new Date(s.includes('T') ? s : s.replace(' ', 'T')).toISOString());

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/* ------------------------------------------------------------------ *
 * Post
 * ------------------------------------------------------------------ */

export const postSchema = z.object({
  title: prose(120),
  slug,
  date: publishDate,
  summary: prose(300),
  tags: z.array(slug).min(1).max(6),
  /**
   * Set only when the canonical lives elsewhere, e.g. a guest post syndicated
   * back here. Emits <link rel="canonical"> at the other origin and drops the
   * URL from the sitemap, so syndicated copies never compete with the original.
   */
  canonicalUrl: httpsUrl.optional(),
  readTime: z.number().int().positive().max(120),
  /** Routes the entry to /research/ instead of /blog/ and swaps BlogPosting for ScholarlyArticle. */
  isResearchPaper: z.boolean().default(false),
  cover: z.string().startsWith('/assets/').optional(),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  series: z.string().optional(),
});

/* ------------------------------------------------------------------ *
 * TIL
 * ------------------------------------------------------------------ */

export const tilCategory = z.enum(['k8s', 'docker', 'grafana', 'ebpf', 'linux']);

export const tilSchema = z.object({
  title: prose(100),
  slug,
  date: publishDate,
  category: tilCategory,
  codeSnippet: z
    .object({
      lang: z.enum(['bash', 'yaml', 'go', 'promql', 'hcl', 'dockerfile', 'sql', 'json']),
      code: z.string().min(1).max(2000),
      /** Shown above the block. Not prose-checked: it is a filename or command. */
      caption: z.string().max(120).optional(),
    })
    .optional(),
  /**
   * The payload of a TIL. Kept to 1..3 so an entry stays a snippet rather than
   * drifting into a blog post that belongs in /blog/.
   */
  takeaways: z.array(prose(240)).min(1).max(3),
});

/* ------------------------------------------------------------------ *
 * Talk
 * ------------------------------------------------------------------ */

export const talkBadge = z.enum([
  'keynote',
  'lightning',
  'workshop',
  'panel',
  'meetup',
  'conference',
  'upcoming',
  'cfp-submitted',
]);

export const talkSchema = z
  .object({
    title: prose(160),
    slug,
    eventName: prose(120),
    date: isoDate,
    location: prose(80),
    slideUrl: httpsUrl.optional(),
    videoUrl: httpsUrl.optional(),
    repoUrl: httpsUrl.optional(),
    /** Organiser-reported headcount. Omit rather than estimate. */
    audienceSize: z.number().int().positive().optional(),
    badges: z.array(talkBadge).min(1),
    abstract: prose(600).optional(),
  })
  .refine(
    (t) => !t.badges.includes('cfp-submitted') || (!t.videoUrl && !t.slideUrl),
    { message: 'A cfp-submitted talk cannot carry slides or a recording yet.' },
  );

/* ------------------------------------------------------------------ *
 * Contribution
 * ------------------------------------------------------------------ */

export const contributionType = z.enum(['code', 'docs', 'translation']);
export const contributionState = z.enum(['merged', 'open', 'closed']);

export const contributionSchema = z
  .object({
    /** `owner/repo`. Employer-internal orgs are rejected outright, see below. */
    project: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, 'Expected owner/repo')
      .refine((p) => !p.toLowerCase().startsWith('orocorp/'), {
        message:
          'Employer-internal repository. Publishing orocorp/* repo names and ticket IDs ' +
          'would disclose Oro architecture. Upstream contributions only.',
      }),
    prNumber: z.number().int().positive(),
    prUrl: httpsUrl.refine((u) => u.includes('/pull/'), 'Must link directly to the PR'),
    type: contributionType,
    state: contributionState,
    impactSummary: prose(400),
    /** Required when merged, forbidden otherwise. An open PR has no merge date. */
    mergedAt: isoDate.optional(),
    /** Where the work is visible to a reader, e.g. https://ebpf.io/hi-in/ */
    liveUrl: httpsUrl.optional(),
  })
  .refine((c) => (c.state === 'merged' ? !!c.mergedAt : !c.mergedAt), {
    message: 'mergedAt is required for merged PRs and must be absent otherwise.',
    path: ['mergedAt'],
  });

/* ------------------------------------------------------------------ *
 * Deal
 * ------------------------------------------------------------------ */

export const dealProvider = z.enum(['LinuxFoundation', 'FinOps']);

export const dealSchema = z
  .object({
    examName: prose(120),
    provider: dealProvider,
    defaultPrice: z.number().positive(),
    discountPercent: z.number().int().min(1).max(100),
    promoCode: z.string().regex(/^[A-Z0-9_]{4,20}$/, 'Uppercase, digits and underscore only'),
    /**
     * Must be a /go/ short link, never a raw awin1.com URL. Raw Awin URLs in
     * page source get scraped and reused by competitors, and they cannot be
     * re-pointed without a rebuild of every page that embeds them.
     */
    affiliateUrl: sitePath.refine((p) => p.startsWith('/go/'), {
      message: 'Use a /go/ short link. Raw Awin URLs must never appear in page source.',
    }),
    /** ISO date, or null for the evergreen partner codes which do not expire. */
    expiry: isoDate.nullable(),
    /** Links the commercial offer to the educational roadmap that justifies it. */
    studyGuideSlug: slug.optional(),
  })
  .refine(
    (d) => Math.round(d.defaultPrice * (100 - d.discountPercent)) / 100 > 0,
    'Discounted price resolves to zero or less',
  );

/** Single source of truth for displayed prices. Never hardcode the result. */
export const discountedPrice = (d: z.infer<typeof dealSchema>): number =>
  Math.round((d.defaultPrice * (100 - d.discountPercent)) / 100);

/* ------------------------------------------------------------------ *
 * SocialProof
 * ------------------------------------------------------------------ */

export const socialPlatform = z.enum(['x', 'linkedin']);

export const socialProofSchema = z.object({
  platform: socialPlatform,
  /** Post id only, not a full URL. The embed URL is built per platform. */
  embedId: z.string().regex(/^[\w-]{6,64}$/, 'Post id only, not a URL'),
  highlightQuote: prose(280),
  metrics: z.object({
    impressions: z.number().int().nonnegative(),
    reposts: z.number().int().nonnegative(),
  }),
  postedAt: isoDate,
  permalink: httpsUrl,
});

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type Post = z.infer<typeof postSchema>;
export type TIL = z.infer<typeof tilSchema>;
export type Talk = z.infer<typeof talkSchema>;
export type Contribution = z.infer<typeof contributionSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type SocialProof = z.infer<typeof socialProofSchema>;
