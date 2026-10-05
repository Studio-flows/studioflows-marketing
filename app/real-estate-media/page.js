import { RemNoirLanding } from "@/components/real-estate-media/RemNoirLanding";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Real Estate Media OS",
  description:
    "One industry example of StudioFlows for service businesses: connected booking, field work, editing, and delivery for real estate media companies.",
  path: "/real-estate-media",
});

export default function RealEstateMediaPage() {
  return <RemNoirLanding />;
}
