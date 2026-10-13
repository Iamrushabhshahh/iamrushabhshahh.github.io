import { til, books, games, now } from '#content';

/**
 * Velite logs a schema failure as an "info" line and still emits the entry
 * with its raw values, so an em-dash title or a malformed tag would ship with
 * a green build. Strict mode is not an option either: it also fails on the
 * harmless "content is empty" notice for a TIL with no body. So the rules that
 * matter are re-checked here, where a throw does stop `next build`.
 */
const DASH = /[\u2014\u2013]/;
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
{
  const problems: string[] = [];
  const prose = (where: string, v: unknown) => {
    if (typeof v !== 'string' || !v.trim()) problems.push(`${where}: missing`);
    else if (DASH.test(v)) problems.push(`${where}: em-dash or en-dash in "${v}"`);
  };
  for (const e of til) {
    const at = `content/til ${e.slug ?? '(no slug)'}`;
    prose(`${at} title`, e.title);
    e.takeaways?.forEach((k, i) => prose(`${at} takeaway ${i + 1}`, k));
    if (!Array.isArray(e.tags) || e.tags.length === 0 || e.tags.some((x) => !TAG.test(x)))
      problems.push(`${at}: tags must be 1 to 5 lowercase-with-dashes words`);
    if (Number.isNaN(Date.parse(e.date))) problems.push(`${at}: unparseable date`);
  }
  for (const b of books) {
    prose(`content/reading ${b.slug} title`, b.title);
    prose(`content/reading ${b.slug} author`, b.author);
  }
  for (const g of games) {
    prose(`content/games ${g.slug} title`, g.title);
    prose(`content/games ${g.slug} platform`, g.platform);
  }
  if (!DAY.test(now.updated)) problems.push('content/now.md: updated must be YYYY-MM-DD');
  now.focus?.forEach((f, i) => prose(`content/now.md focus ${i + 1}`, f));
  if (problems.length) throw new Error(`Journal content failed validation:\n  ${problems.join('\n  ')}`);
}


/**
 * Published entries only, newest first. A TIL dated in the future is treated
 * like a scheduled blog post: it stays out until the daily rebuild after its
 * date, so the log can be written ahead without leaking early.
 */
const BUILT_AT = Date.now();

export const tils = til
  .filter((t) => !t.draft && Date.parse(t.date) <= BUILT_AT)
  .sort((a, b) => b.date.localeCompare(a.date));

export const bookList = [...books];
export const gameList = [...games];
export const nowPage = now;

export const fmtDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
