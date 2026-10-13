import { person, PERSON_ID, SITE_URL, credentials } from '@/lib/site';
import type { Engagement } from '@/lib/schemas';
import { isStage } from '@/lib/engagement';
import { abs } from '@/lib/utils';

/**
 * JSON-LD emitters.
 *
 * Context that matters: ../scripts/build-blog.mjs already emits 447 JSON-LD
 * nodes across 17 types, including a full `Person` node. These components must
 * therefore REFERENCE that entity by @id rather than redefine it. Two competing
 * Person nodes for one site is worse than none, because Google resolves neither.
 *
 * Rule of thumb applied throughout: a node that already exists elsewhere is
 * linked as `{"@id": ...}`; only genuinely new nodes are defined inline.
 */

/** Serialises safely: `</script>` inside a string would otherwise close the tag. */
function JsonLd({ data, id }: { data: unknown; id?: string }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      id={id}
      // eslint-disable-next-line react/no-danger -- JSON-LD has no other injection path
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/**
 * The Person node. Emit this on ONE page only (the speaker kit), and reference
 * it by @id everywhere else. It intentionally matches the node already produced
 * by the generator, extended with alumniOf and the credential list.
 */
export function PersonSchema() {
  return (
    <JsonLd
      id="ld-person"
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': PERSON_ID,
        name: person.name,
        url: `${SITE_URL}/`,
        jobTitle: person.jobTitle,
        image: person.image,
        email: `mailto:${person.email}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: person.location.city,
          addressRegion: person.location.region,
          addressCountry: person.location.country,
        },
        worksFor: { '@type': 'Organization', name: person.employer },
        alumniOf: [
          { '@type': 'Organization', name: 'KodeKloud' },
          { '@type': 'Organization', name: 'Koenig Solutions' },
          { '@type': 'Organization', name: 'Genuin' },
          { '@type': 'Organization', name: 'Tridhya Tech Limited' },
        ],
        sameAs: [...person.sameAs],
        award: ['Docker Captain (2026)', 'Grafana Champion (2026)'],
        hasCredential: credentials
          .filter((c) => ['ckad', 'kcna', 'az-104'].includes(c.id))
          .map((c) => ({
            '@type': 'EducationalOccupationalCredential',
            name: `${c.label}: ${c.detail}`,
            credentialCategory: 'certification',
            recognizedBy: { '@type': 'Organization', name: c.issuer },
          })),
      }}
    />
  );
}

/**
 * /speaking/. There is no `SpeakerProfile` type in schema.org, so the correct
 * encoding is a ProfilePage whose mainEntity is the existing Person (by @id,
 * never redefined), with each stage appearance attached as a `performerIn`
 * Event. Organising, jury and booth work are left out of the Event list: the
 * person was not a performer there, and saying so to a parser is the same
 * misrepresentation as saying it to a reader.
 */
export function SpeakingSchema({ engagements, path }: { engagements: Engagement[]; path: string }) {
  const url = `${SITE_URL}${path}`;
  return (
    <JsonLd
      id="ld-speaking"
      data={{
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${url}#profilepage`,
        url,
        name: `${person.name}, speaking`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': PERSON_ID },
        mainEntity: {
          '@id': PERSON_ID,
          performerIn: engagements.filter(isStage).map((e) => ({
            '@type': 'Event',
            '@id': `${url}#${e.slug}`,
            name: e.title,
            startDate: e.start,
            ...(e.endDate ? { endDate: e.endDate } : {}),
            ...(e.abstract ? { description: e.abstract } : {}),
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            location: {
              '@type': 'Place',
              name: e.venue ?? e.event,
              address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: e.country },
            },
            ...(e.organizer ? { organizer: { '@type': 'Organization', name: e.organizer } } : {}),
            superEvent: { '@type': 'Event', name: e.event },
            performer: { '@id': PERSON_ID },
            ...(e.links.session || e.links.event ? { url: abs((e.links.session ?? e.links.event)!) } : {}),
            ...(e.links.video ? { recordedIn: { '@type': 'VideoObject', contentUrl: e.links.video } } : {}),
          })),
        },
      }}
    />
  );
}

/** Generic page node. `primaryImageOfPage` is omitted when there is no OG image. */
export function ItemPageSchema({
  path,
  name,
  description,
  image,
  breadcrumb,
}: {
  path: string;
  name: string;
  description: string;
  image?: string;
  breadcrumb?: { name: string; path: string }[];
}) {
  const url = `${SITE_URL}${path}`;
  return (
    <>
      <JsonLd
        id="ld-itempage"
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemPage',
          '@id': `${url}#webpage`,
          url,
          name,
          description,
          inLanguage: 'en',
          isPartOf: { '@id': `${SITE_URL}/#website` },
          author: { '@id': PERSON_ID },
          publisher: { '@id': PERSON_ID },
          ...(image ? { primaryImageOfPage: image } : {}),
        }}
      />
      {breadcrumb && breadcrumb.length > 0 && (
        <JsonLd
          id="ld-breadcrumb"
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumb.map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: b.name,
              item: `${SITE_URL}${b.path}`,
            })),
          }}
        />
      )}
    </>
  );
}
