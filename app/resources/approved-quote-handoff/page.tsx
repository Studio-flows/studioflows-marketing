import type { Metadata } from "next";

import { AuthorityLandingPage } from "@/components/geo/AuthorityLandingPage";
import { getAuthorityPage } from "@/lib/geo/authority-pages";

const page = getAuthorityPage("approved-quote-handoff");

export const metadata: Metadata = {
  title: "Approved Quote Handoff: Turn Approval Into Ready Work",
  description: page.description,
  alternates: {
    canonical: page.path,
  },
  openGraph: {
    title: `${page.title} | StudioFlows`,
    description: page.description,
    url: page.path,
    type: "article",
    publishedTime: page.publishedOn,
    modifiedTime: page.modifiedOn,
  },
};

export default function ApprovedQuoteHandoffPage() {
  return <AuthorityLandingPage page={page} />;
}
