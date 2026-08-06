import CustomOpsHubClient from "./CustomOpsHubClient";

export const metadata = {
  title: "Build Your Private Ops Teardown",
  description:
    "A direct private operating diagnosis — founder bottlenecks, handoff breaks, tool fragmentation, and what delays cost. Takes about 5–7 minutes.",
  alternates: {
    canonical: "/services/custom-ops-hub",
  },
  openGraph: {
    title: "Build Your Private Ops Teardown | StudioFlows",
    description:
      "Answer direct questions about how work moves through your business and generate a private Ops Teardown artifact.",
    url: "/services/custom-ops-hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build Your Private Ops Teardown | StudioFlows",
    description:
      "Private operating diagnosis for founder-led businesses — not a lightweight quiz.",
  },
};

export default function CustomOpsHubPage() {
  return <CustomOpsHubClient />;
}
