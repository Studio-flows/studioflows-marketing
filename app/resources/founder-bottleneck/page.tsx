import type { Metadata } from "next";

import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { getAuthorityPage } from "@/lib/geo/authority-pages";

const page = getAuthorityPage("founder-bottleneck");

export const metadata: Metadata = {
  title: "Founder Bottleneck: Find Where Work Waits on You",
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

export default function FounderBottleneckPage() {
  return <AuthorityArticle page={page} />;
}
