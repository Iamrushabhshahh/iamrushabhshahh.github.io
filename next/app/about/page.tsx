import type { Metadata } from 'next';
import { SITE_URL, bios } from '@/lib/site';
import { CredentialShelf } from '@/components/CredentialShelf';
import { ItemPageSchema } from '@/components/SEO/StructuredData';

const TITLE = 'About · Rushabh Shah';
const DESCRIPTION =
  'Rushabh Shah, DevOps engineer at Oro, Docker Captain and Grafana Champion. Career timeline, what I work on, and the community work behind it.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about/` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/about/` },
};

/** Mirrors the EXPERIENCE array in ../scripts/build-blog.mjs. Keep both in step. */
const TIMELINE = [
  {
    role: 'DevOps Engineer',
    org: 'Oro',
    period: 'Jun 2025 - Present',
    current: true,
    detail:
      'Kubernetes workloads with Helm and GitOps via Argo CD, CI/CD on GitHub Actions, infrastructure as code in Terraform, and observability across Prometheus, Grafana, Loki, Tempo and OpenTelemetry. Cloud cost optimization and security hardening across the platform.',
  },
  {
    role: 'Corporate Trainer',
    org: 'Koenig Solutions Pvt. Ltd.',
    period: 'Jun 2025 - Jul 2025',
    detail:
      'Delivered live virtual and classroom training on Azure role-based certifications (AZ-900, AZ-104, AZ-305, AZ-400) to working IT professionals and enterprise teams.',
  },
  {
    role: 'DevOps Engineer',
    org: 'Genuin',
    period: 'Jan 2025 - May 2025',
    detail:
      'Drove a 59 percent AWS cost reduction, built CI/CD pipelines that brought release time to roughly ten minutes, led a zero downtime AWS to Oracle Cloud Infrastructure migration under a fixed deadline, and implemented controls for ISO and SOC Type 1 readiness.',
  },
  {
    role: 'Jr DevOps Engineer',
    org: 'KodeKloud',
    period: 'Jul 2024 - Dec 2024',
    detail:
      'Built hands-on Azure labs and multi-cloud lab environments across AWS, Azure and GCP, automated provisioning with Terraform, Ansible and Bash, and represented KodeKloud at the inaugural KubeCon India in Delhi.',
  },
  {
    role: 'Jr DevOps Engineer',
    org: 'Tridhya Tech Limited',
    period: 'Jun 2023 - Jun 2024',
    detail:
      'Built and maintained Docker images and Kubernetes workloads, designed CI/CD pipelines on Jenkins and GitHub Actions, and provisioned infrastructure with Terraform and Ansible across Azure and AWS.',
  },
];

export default function AboutPage() {
  return (
    <main id="main" className="container mx-auto px-6 py-16">
      <ItemPageSchema
        path="/about/"
        name={TITLE}
        description={DESCRIPTION}
        breadcrumb={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about/' },
        ]}
      />

      <header className="mb-14 max-w-3xl">
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-strong md:text-5xl">
          About
        </h1>
        {bios[250].split('\n\n').map((p, i) => (
          <p key={i} className={i > 0 ? 'mt-4 text-base leading-relaxed text-body' : 'text-base leading-relaxed text-body'}>
            {p}
          </p>
        ))}
      </header>

      <section aria-labelledby="timeline" className="mb-16">
        <h2 id="timeline" className="mb-8 text-2xl font-bold text-strong">
          Where I have worked
        </h2>
        <ol className="relative list-none space-y-8 border-l border-[var(--border-color)] p-0 pl-6">
          {TIMELINE.map((job) => (
            <li key={`${job.org}-${job.period}`} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.6rem] top-2 h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: job.current ? 'var(--green-color)' : 'var(--border-color)',
                }}
              />
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-lg font-bold text-strong">{job.role}</h3>
                {job.current && (
                  <span className="rounded-full bg-primary-tint/10 px-2 py-0.5 font-fira text-[0.7rem] text-[color:var(--green-color)]">
                    current
                  </span>
                )}
              </div>
              <p className="text-sm text-primary">{job.org}</p>
              <p className="mb-2 font-fira text-xs text-muted">{job.period}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-body">{job.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <CredentialShelf />
    </main>
  );
}
