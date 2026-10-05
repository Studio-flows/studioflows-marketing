import type { Metadata } from "next";

import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { getAuthorityPage } from "@/lib/geo/authority-pages";
import { publicPageMetadata } from "@/lib/seo";

const page = getAuthorityPage("business-that-runs-without-you");

export const metadata: Metadata = publicPageMetadata({
  title: "How to Build a Business That Can Run Without You",
  description: page.description,
  path: page.path,
  article: {
    publishedTime: page.publishedOn,
    modifiedTime: page.modifiedOn,
  },
});

export default function BusinessThatRunsWithoutYouPage() {
  return <AuthorityArticle page={page} />;
}
