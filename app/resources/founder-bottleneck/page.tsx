import type { Metadata } from "next";

import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { getAuthorityPage } from "@/lib/geo/authority-pages";
import { publicPageMetadata } from "@/lib/seo";

const page = getAuthorityPage("founder-bottleneck");

export const metadata: Metadata = publicPageMetadata({
  title: "Founder Bottleneck: Find Where Work Waits on You",
  description: page.description,
  path: page.path,
  article: {
    publishedTime: page.publishedOn,
    modifiedTime: page.modifiedOn,
  },
});

export default function FounderBottleneckPage() {
  return <AuthorityArticle page={page} />;
}
