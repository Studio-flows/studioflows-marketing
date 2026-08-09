import type { Metadata } from "next";

import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { getAuthorityPage } from "@/lib/geo/authority-pages";

const page = getAuthorityPage("scope-change-propagation");

export const metadata: Metadata = {
  title: "Scope Change Process: Keep the Job in One Version",
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

export default function ScopeChangePropagationPage() {
  return <AuthorityArticle page={page} />;
}
