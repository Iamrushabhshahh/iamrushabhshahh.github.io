import { defineConfig, defineCollection, s } from 'velite';

/**
 * Velite handles the markdown collections only. The structured collections
 * (talks, contributions, deals) are plain JSON imported directly and validated
 * with the same Zod schemas in lib/schemas.ts, because they have no markdown
 * body and routing them through a content pipeline would buy nothing.
 *
 * Note `s.*` here is Velite's re-export of Zod with a few file-aware helpers
 * (s.slug, s.markdown), so these definitions and lib/schemas.ts share one
 * validation engine.
 */

const til = defineCollection({
  name: 'TIL',
  pattern: 'til/**/*.md',
  schema: s
    .object({
      title: s.string().max(100),
      slug: s.slug('til'),
      date: s.isodate(),
      category: s.enum(['k8s', 'docker', 'grafana', 'ebpf', 'linux']),
      takeaways: s.array(s.string().max(240)).min(1).max(3),
      codeSnippet: s
        .object({
          lang: s.enum(['bash', 'yaml', 'go', 'promql', 'hcl', 'dockerfile', 'sql', 'json']),
          code: s.string(),
          caption: s.string().max(120).optional(),
        })
        .optional(),
      body: s.markdown(),
    })
    .transform((data) => ({ ...data, permalink: `/til/${data.slug}/` })),
});

export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static', base: '/static/', clean: true },
  collections: { til },
});
