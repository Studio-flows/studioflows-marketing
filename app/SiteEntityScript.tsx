import { absoluteUrl, PUBLIC_SOCIAL_IMAGE, PUBLIC_SITE_ORIGIN, SITE_POSITIONING } from "@/lib/seo";

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
      description: SITE_POSITIONING.description,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(PUBLIC_SOCIAL_IMAGE.url),
      },
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "StudioFlows",
      url: PUBLIC_SITE_ORIGIN,
      description: SITE_POSITIONING.description,
      audience: {
        "@type": "Audience",
        audienceType: "Owners, managers, and teams of service businesses across industries",
      },
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
