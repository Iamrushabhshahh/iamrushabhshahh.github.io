/**
 * Canonical identity data. This file is the single source for the Person
 * JSON-LD, the speaker kit and every page's metadata.
 *
 * It intentionally mirrors the `Person` node already emitted by
 * ../scripts/build-blog.mjs. Both generators must agree on @id
 * ("https://rushabhshah.dev/#person") or Google sees two competing Person
 * entities for one site and trusts neither. If you change sameAs here, change
 * it there too.
 */

export const SITE_URL = 'https://rushabhshah.dev';
export const PERSON_ID = `${SITE_URL}/#person`;

export const person = {
  name: 'Rushabh Shah',
  jobTitle: 'DevOps Engineer',
  employer: 'Oro',
  location: { city: 'Ahmedabad', region: 'Gujarat', country: 'IN' },
  email: 'hello@rushabhshah.dev',
  image: `${SITE_URL}/assets/rushabh-shah.webp`,
  sameAs: [
    'https://github.com/iamrushabhshahh',
    'https://in.linkedin.com/in/iamrushabhshahh',
    'https://twitter.com/iamrushabhshahh',
    'https://www.docker.com/contributors/rushabh-shah/',
    'https://grafana.com/community/champions/',
    'https://www.credly.com/users/iamrushabhshahh',
    'https://sessionize.com/iamrushabhshahh/',
    'https://substack.com/@rushabhshah124804',
    'https://dev.to/iamrushabhshahh',
    'https://www.reddit.com/user/iamrushabhshah/',
  ],
} as const;

/**
 * Pre-approved bios. Conference organisers copy these verbatim into programmes,
 * so they are fixed text, not templates. Word counts are asserted in
 * lib/__checks__/bios.test.ts so an edit cannot silently break the 50/100/250
 * contract an organiser is relying on.
 */
export const bios = {
  50: `Rushabh Shah is a DevOps engineer at Oro in Ahmedabad, India, and a Docker Captain and Grafana Champion selected in 2026. He runs Kubernetes in production, builds observability on the Grafana LGTM stack and OpenTelemetry, and organizes Grafana & Friends Ahmedabad, a community meetup for engineers working on observability.`,

  100: `Rushabh Shah is a DevOps engineer at Oro in Ahmedabad, India. He is a Docker Captain and a Grafana Champion, both selected in 2026, placing him among roughly 220 and 110 people worldwide in those programs. His day job is Kubernetes in production: Helm and Argo CD for delivery, Terraform for infrastructure, and the Grafana LGTM stack with OpenTelemetry for observability. He has cut cloud spend by 59 percent and led a zero downtime cloud migration under a fixed deadline. He organizes Grafana & Friends Ahmedabad, and translates Kubernetes and eBPF documentation into Hindi so the material reaches engineers who do not read English first.`,

  250: `Rushabh Shah is a DevOps engineer at Oro in Ahmedabad, India, where he runs Kubernetes workloads for a lending business: Helm charts and GitOps delivery through Argo CD, infrastructure as code in Terraform, CI/CD on GitHub Actions, and observability built on Prometheus, Grafana, Loki, Tempo and OpenTelemetry.

He is a Docker Captain and a Grafana Champion, both selected in 2026, two invitation only programs with roughly 220 and 110 members worldwide respectively. He organizes Grafana & Friends Ahmedabad, a community meetup focused on observability and the LGTM stack, and he represented KodeKloud at the inaugural KubeCon India in Delhi in 2024.

Before Oro he drove a 59 percent reduction in AWS spend at Genuin, built delivery pipelines that brought release time to about ten minutes, and led a zero downtime migration from AWS to Oracle Cloud Infrastructure against a fixed deadline. Earlier he built hands on cloud labs at KodeKloud and delivered Azure certification training to enterprise teams at Koenig Solutions.

A large part of his open source work is localization. He contributed the Hindi localization of ebpf.io, translated the Kusion README into Hindi, and has an ongoing series of Hindi localization pull requests against the Kubernetes documentation. The reasoning is simple: most cloud native documentation assumes fluent English, which quietly excludes a large share of the engineers who most need it.

He writes at rushabhshah.dev about Kubernetes, observability and the parts of running infrastructure that only show up during an incident, including postmortems of failures he has debugged himself.`,
} as const;

/**
 * Every credential the shelf renders. `proofUrl` is what makes each one
 * checkable: a reviewer confirms it on the issuer's own domain, not here.
 *
 * Typed explicitly rather than with `as const`, because a const-asserted
 * heterogeneous array produces a union in which the optional members
 * (`icon`, `internalUrl`) only exist on some branches, and every read then
 * needs a narrowing check.
 */
export interface Credential {
  id: string;
  label: string;
  issuer: string;
  year: number;
  detail: string;
  /** Issuer-side proof. Required: a credential nobody can verify is not evidence. */
  proofUrl: string;
  /** Optional deep link to this site's own write-up of the credential. */
  internalUrl?: string;
  /** Optional issuer logo, from /assets/icons/color/. */
  icon?: string;
  /** CSS custom property driving the chip's accent colour. */
  tint: string;
}

export const credentials: Credential[] = [
  {
    id: 'docker-captain',
    label: 'Docker Captain',
    issuer: 'Docker, Inc.',
    year: 2026,
    detail: 'One of roughly 220 worldwide',
    proofUrl: 'https://www.docker.com/contributors/rushabh-shah/',
    internalUrl: '/docker-captain/',
    icon: '/assets/icons/color/docker-1d63ed.svg',
    tint: 'var(--docker-blue)',
  },
  {
    id: 'grafana-champion',
    label: 'Grafana Champion',
    issuer: 'Grafana Labs',
    year: 2026,
    detail: 'One of roughly 110 worldwide',
    proofUrl: 'https://grafana.com/community/champions/',
    icon: '/assets/icons/color/grafana-f47b20.svg',
    tint: 'var(--accent-orange)',
  },
  {
    id: 'devstats',
    label: 'CNCF DevStats 178',
    issuer: 'CNCF',
    year: 2026,
    detail: 'Weighted contribution score across CNCF projects',
    proofUrl: 'https://devstats.cluster.fun/',
    internalUrl: '/blog/cncf-devstats-score/',
    tint: 'var(--accent-purple)',
  },
  {
    id: 'ebpf-translator',
    label: 'eBPF Hindi translator',
    issuer: 'ebpf.io',
    year: 2025,
    detail: 'Authored the Hindi localization of ebpf.io',
    proofUrl: 'https://ebpf.io/hi-in/',
    internalUrl: '/contributions/',
    tint: 'var(--green-color)',
  },
  {
    id: 'kcna',
    label: 'KCNA',
    issuer: 'The Linux Foundation',
    year: 2025,
    detail: 'Kubernetes and Cloud Native Associate',
    proofUrl: 'https://www.credly.com/users/iamrushabhshahh',
    tint: 'var(--primary-color)',
  },
  {
    id: 'az-104',
    label: 'AZ-104',
    issuer: 'Microsoft',
    year: 2024,
    detail: 'Azure Administrator Associate',
    proofUrl: 'https://www.credly.com/users/iamrushabhshahh',
    tint: 'var(--primary-color)',
  },
];
