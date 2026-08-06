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

export default function OpsTeardownThankYouPage({ searchParams }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string" && value.trim()) {
      query.set(key, value);
    }
  }
  const initialSearch = query.toString() ? `?${query.toString()}` : "";

  return <OpsTeardownThankYouClient initialSearch={initialSearch} />;
}
