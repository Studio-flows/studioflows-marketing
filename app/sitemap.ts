import type { MetadataRoute } from "next";

import { PUBLIC_SITE_ORIGIN } from "@/lib/seo";

const INDEXABLE_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }> =
  [
    { path: "/", priority: 0.8, changeFrequency: "weekly" },
    { path: "/services/custom-ops-hub", priority: 0.75, changeFrequency: "monthly" },
    { path: "/vessa", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms-of-service", priority: 0.3, changeFrequency: "yearly" },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${PUBLIC_SITE_ORIGIN}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
