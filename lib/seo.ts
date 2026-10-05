import type { Metadata, MetadataRoute } from "next";

export const PUBLIC_SITE_ORIGIN = "https://www.studioflows.co";

export const SITE_POSITIONING = {
  title: "AI Operating System for Service Businesses",
  description:
    "StudioFlows is the AI-native operating system for service businesses of all types. Connect your team, work, and AI around how your business operates.",
} as const;

export const PUBLIC_SOCIAL_IMAGE = {
  url: "/StudioFlows%20logo%20(1200%20x%20675%20px)%20(1).png",
  width: 1120,
  height: 459,
  alt: "StudioFlows — AI operating system for service businesses",
} as const;

export function publicPageMetadata({
  title,
  description,
  path,
  article,
}: {
  title: string;
  description: string;
  path: string;
  article?: { publishedTime: string; modifiedTime: string };
}): Metadata {
  const socialTitle = `${title} | StudioFlows`;
  return {
    title: { absolute: socialTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: "StudioFlows",
      locale: "en_US",
      type: article ? "article" : "website",
      ...article,
      images: [PUBLIC_SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [PUBLIC_SOCIAL_IMAGE],
    },
  };
}

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
    path: "/",
    ...SITE_POSITIONING,
    changeFrequency: "weekly",
    priority: 1,
  },
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
    description: "Founder bottleneck diagnostic and Ops Drag Audit path for service businesses.",
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
    path: "/ops-overload",
    title: "When Operations Still Depend on You",
    description: "Find where service-business handoffs, decisions, and customer updates still depend on the owner.",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/real-estate-media",
    title: "Real Estate Media OS",
    description: "One industry example of StudioFlows for service businesses: connected booking, field work, editing, and delivery for real estate media companies.",
    changeFrequency: "weekly",
    priority: 0.79,
  },
  {
    path: "/platform",
    title: "Accelerate Waitlist",
    description: "Join the Accelerate waitlist for StudioFlows OS and operating models for service businesses across industries. Waitlist only; not generally available.",
    changeFrequency: "weekly",
    priority: 0.78,
  },
  {
    path: "/services/custom-ops-hub",
    title: "Ops Teardown",
    description: "An Ops Teardown for service businesses to find where handoffs, exceptions, and status work still depend on the owner.",
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
