import OpsTeardownThankYouClient from "./OpsTeardownThankYouClient";

export const metadata = {
  title: "Your Ops Teardown | StudioFlows",
  description:
    "Your StudioFlows Ops Teardown handoff is confirmed. Download your sheet and book your ops audit when ready.",
  alternates: {
    canonical: "/services/custom-ops-hub/teardown",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpsTeardownThankYouPage() {
  return <OpsTeardownThankYouClient />;
}
