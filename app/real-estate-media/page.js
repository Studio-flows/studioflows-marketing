import { RemNoirLanding } from "@/components/real-estate-media/RemNoirLanding";

export const metadata = {
  title: "Real Estate Media OS",
  description:
    "See booking, crew, field work, uploads, editing, delivery, and payments in one operating system for owner-led real estate media companies.",
  alternates: {
    canonical: "/real-estate-media",
  },
  openGraph: {
    title: "Real Estate Media OS | StudioFlows",
    description:
      "See how booking, crew, field work, uploads, editing, delivery, and payments stay connected in one real estate media operation.",
    url: "/real-estate-media",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Real Estate Media OS | StudioFlows",
    description:
      "See how booking, crew, field work, uploads, editing, delivery, and payments stay connected in one real estate media operation.",
  },
};

export default function RealEstateMediaPage() {
  return <RemNoirLanding />;
}
