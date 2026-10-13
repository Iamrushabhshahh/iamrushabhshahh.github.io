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

/**
 * Pages CMS writes a blank optional field as "" or null, and `.optional()`
 * accepts neither, so one empty box in the editor would fail the whole build.
 * Strip those before validating. Empty arrays go too, for the same reason.
 */
export function stripEmpty<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripEmpty) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => [k, stripEmpty(v)]),
    ) as T;
  }
  return value;
}

/* ------------------------------------------------------------------ *
 * Speaking: engagements, ongoing roles, topics
 * ------------------------------------------------------------------ */

/**
 * What the person actually did at an event. The kinds are kept apart on
 * purpose: a reviewer who checks a schedule and finds a booth shift listed as a
 * talk discards the whole page, so organising, jury work and booth duty are
 * never rounded up into "talks".
 */
export const engagementKind = z.enum([
  'talk',
  'lightning',
  'workshop',
  'jury',
  'organizing',
  'hosting',
  'volunteer',
  'booth',
]);

/**
 * `2026-07` when only the month is known, `2026-11-09`, or
 * `2026-11-09T12:25:00-07:00`. The offset is required with a time, so an
 * add-to-calendar link can never land an hour off.
 */
const eventStart = z
  .string()
  .regex(
    /^\d{4}-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2})?)?$/,
    'Expected YYYY-MM, YYYY-MM-DD, or a full timestamp with a UTC offset',
  );

/** Internal links stay root-relative so they never fork the canonical host. */
const linkUrl = z.union([httpsUrl, sitePath]);

export const engagementSchema = z.object({
  slug,
  title: prose(160),
  kind: engagementKind,
  /** Qualifies the kind when it needs it, e.g. "Co-speaker, pre-recorded segment". */
  role: prose(80).optional(),
  event: prose(140),
  organizer: prose(120).optional(),
  start: eventStart,
  /** Last day, for multi-day events. */
  endDate: isoDate.optional(),
  durationMinutes: z.number().int().positive().max(600).optional(),
  venue: prose(120).optional(),
  city: prose(60),
  country: prose(40),
  coSpeakers: z.array(prose(80)).max(6).default([]),
  abstract: prose(700).optional(),
  links: z
    .object({
      event: linkUrl.optional(),
      session: linkUrl.optional(),
      slides: linkUrl.optional(),
      video: httpsUrl.optional(),
      repo: httpsUrl.optional(),
      post: linkUrl.optional(),
    })
    .default({}),
  /** Meetup RSVPs. Shown as RSVPs, never as attendance. */
  rsvps: z.number().int().positive().optional(),
  /** Counted attendance, only when someone in the room counted. */
  attendees: z.number().int().positive().optional(),
});

export const roleSchema = z.object({
  title: prose(80),
  org: prose(120),
  since: z.string().regex(/^\d{4}(-\d{2})?$/, 'Expected YYYY or YYYY-MM'),
  /** Set when the role has ended; ongoing roles leave it out. */
  until: z.string().regex(/^\d{4}(-\d{2})?$/, 'Expected YYYY or YYYY-MM').optional(),
  summary: prose(300),
  url: linkUrl.optional(),
});

export const topicSchema = z.object({
  title: prose(100),
  summary: prose(300),
  /** Engagement slug this topic has already been given as. */
  basedOn: slug.optional(),
});

/** Organiser or attendee quote. Only published with the person's permission. */
export const testimonialSchema = z.object({
  quote: prose(400),
  name: prose(80),
  context: prose(120),
  url: httpsUrl.optional(),
});

export const speakingSchema = z.object({
  engagements: z.array(engagementSchema),
  roles: z.array(roleSchema),
  topics: z.array(topicSchema),
  testimonials: z.array(testimonialSchema).default([]),
});

/* ------------------------------------------------------------------ *
 * Certifications (shared with ../scripts/build-blog.mjs)
 * ------------------------------------------------------------------ */

export const certSchema = z
  .object({
    slug,
    code: z.string().min(2).max(20),
    /** Exact text of the home-page card. build-blog.mjs renders it verbatim. */
    title: prose(120),
    subtitle: prose(60),
    issuer: prose(60),
    status: z.enum(['earned', 'in-progress', 'planned']),
    earnedOn: isoDate.optional(),
    target: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional(),
    proofUrl: httpsUrl.optional(),
    why: prose(300).optional(),
  })
  .refine((c) => c.status === 'earned' || !c.earnedOn, {
    message: 'Only an earned cert has an earnedOn date.',
    path: ['earnedOn'],
  });

export const certsFileSchema = z.object({ certs: z.array(certSchema) });

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
export type Engagement = z.infer<typeof engagementSchema>;
export type Speaking = z.infer<typeof speakingSchema>;
export type Cert = z.infer<typeof certSchema>;
export type Contribution = z.infer<typeof contributionSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type SocialProof = z.infer<typeof socialProofSchema>;
