import { PUBLIC_SITE_ORIGIN } from "@/lib/seo";

const organizationId = `${PUBLIC_SITE_ORIGIN}/#organization`;
const websiteId = `${PUBLIC_SITE_ORIGIN}/#website`;

const siteEntityGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "StudioFlows",
      url: PUBLIC_SITE_ORIGIN,
      description:
        "StudioFlows turns scattered business signals into approved, trackable execution for service businesses.",
      logo: {
        "@type": "ImageObject",
        url: `${PUBLIC_SITE_ORIGIN}/StudioFlows%20logo%20%281200%20x%20675%20px%29%20%281%29.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "StudioFlows",
      url: PUBLIC_SITE_ORIGIN,
      publisher: {
        "@id": organizationId,
      },
    },
  ],
} as const;

export function SiteEntityScript() {
  return (
    <script
      id="studioflows-site-entity"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(siteEntityGraph) }}
    />
  );
}
