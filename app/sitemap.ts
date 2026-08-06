import type { MetadataRoute } from "next";

import { absoluteUrl, PUBLIC_ROUTE_REGISTRY } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTE_REGISTRY.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
}
