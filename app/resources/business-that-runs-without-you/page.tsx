import type { Metadata } from "next";

import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { getAuthorityPage } from "@/lib/geo/authority-pages";

const page = getAuthorityPage("business-that-runs-without-you");

export const metadata: Metadata = {
  title: "How to Build a Business That Can Run Without You",
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

export default function BusinessThatRunsWithoutYouPage() {
  return <AuthorityArticle page={page} />;
}
