import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppleHomepage from "@/components/home/AppleHomepage";

export const metadata: Metadata = {
  title: "Homepage design preview",
  description: "An editorial design preview for StudioFlows.",
  robots: { index: false, follow: false },
};

export default function AppleDesignPreview() {
  // Allow the review link on Vercel previews, never on the production site.
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  return <AppleHomepage />;
}
