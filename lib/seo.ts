import type { Metadata } from "next";

export const PUBLIC_SITE_ORIGIN = "https://www.studioflows.co";

export const INDEXABLE_PATHS = [
  "/",
  "/services/custom-ops-hub",
  "/vessa",
  "/privacy-policy",
  "/terms-of-service",
] as const;

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_ORIGIN}${normalized}`;
}
