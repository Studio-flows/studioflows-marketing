import AppleHomepage from "@/components/home/AppleHomepage";
import { publicPageMetadata, SITE_POSITIONING } from "@/lib/seo";

export const metadata = publicPageMetadata({ ...SITE_POSITIONING, path: "/" });

export default function HomePage() {
  return <AppleHomepage />;
}
