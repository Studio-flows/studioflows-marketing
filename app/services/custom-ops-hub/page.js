import CustomOpsHubClient from "./CustomOpsHubClient";

export const metadata = {
  title: "Let's build your Ops Teardown",
  description:
    "Tell us how work actually moves day to day and get a specific breakdown of where drag is showing up. Most people finish in about 2 minutes.",
  alternates: {
    canonical: "/services/custom-ops-hub",
  },
  openGraph: {
    title: "Let's build your Ops Teardown | StudioFlows",
    description:
      "Answer 17 quick questions and get a clear Ops Teardown based on how you actually run things.",
    url: "/services/custom-ops-hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Let's build your Ops Teardown | StudioFlows",
    description:
      "A short Ops Teardown from your answers — where handoffs, exceptions, and status work still land on you.",
  },
};

export default function CustomOpsHubPage() {
  return <CustomOpsHubClient />;
}
