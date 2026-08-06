import type { Metadata, MetadataRoute } from "next";

export const PUBLIC_SITE_ORIGIN = "https://www.studioflows.co";

type SitemapChangeFrequency = MetadataRoute.Sitemap[0]["changeFrequency"];

type PublicRouteDefinition = {
  path: string;
  title: string;
  description: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

export const PUBLIC_ROUTE_REGISTRY = [
  {
    path: "/resources",
    title: "Operational Resources",
    description: "Diagnostics and operating models for owner-dependent service businesses.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/silent-collapse",
    title: "Silent Collapse Diagnostic",
    description: "Founder bottleneck diagnostic and Ops Drag Audit path.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/resources/founder-bottleneck",
    title: "Founder Bottleneck",
    description: "A practical method for finding and repairing founder-routed decisions and handoffs.",
    changeFrequency: "monthly",
    priority: 0.86,
  },
  {
    path: "/resources/business-that-runs-without-you",
    title: "Business That Runs Without You",
    description: "A controlled owner-absence continuity test for service businesses.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/",
    title: "StudioFlows",
    description: "Execution infrastructure for owner-dependent service businesses.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/real-estate-media",
    title: "Real Estate Media OS",
    description: "Operating system for real estate media companies where listing jobs still route through the owner.",
    changeFrequency: "weekly",
    priority: 0.79,
  },
  {
    path: "/platform",
    title: "Accelerate Waitlist",
    description: "Waitlist for StudioFlows OS and its service-business operating models.",
    changeFrequency: "weekly",
    priority: 0.78,
  },
  {
    path: "/services/custom-ops-hub",
    title: "Ops Teardown",
    description: "Custom Command audit for locating operational drag.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/vessa",
    title: "Vessa",
    description: "Business intelligence execution system for prepared work, approvals, and recorded outcomes.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description: "Privacy policy for the StudioFlows marketing website.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service",
    description: "Terms for the StudioFlows marketing website and software services.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
] as const satisfies ReadonlyArray<PublicRouteDefinition>;

export const INDEXABLE_PATHS = PUBLIC_ROUTE_REGISTRY.map(({ path }) => path);

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? PUBLIC_SITE_ORIGIN : `${PUBLIC_SITE_ORIGIN}${normalized}`;
}
