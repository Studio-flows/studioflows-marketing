import type { AuthorityPageDefinition } from "@/lib/geo/authority-pages";
import { absoluteUrl } from "@/lib/seo";

export function buildAuthorityPageJsonLd(
  page: AuthorityPageDefinition,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.title,
        description: page.description,
        mainEntityOfPage: absoluteUrl(page.path),
        url: absoluteUrl(page.path),
        datePublished: page.publishedOn,
        dateModified: page.modifiedOn,
        author: {
          "@type": "Organization",
          name: "StudioFlows",
          url: absoluteUrl("/"),
        },
        publisher: {
          "@type": "Organization",
          name: "StudioFlows",
          url: absoluteUrl("/"),
        },
        about: page.primaryQuery,
        citation: page.sources.map(({ url }) => url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Resources",
            item: absoluteUrl("/resources"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.title,
            item: absoluteUrl(page.path),
          },
        ],
      },
    ],
  };
}
