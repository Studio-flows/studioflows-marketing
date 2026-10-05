import CustomOpsHubClient from "./CustomOpsHubClient";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Let's build your Ops Teardown",
  description:
    "An Ops Teardown for service businesses to find where handoffs, exceptions, and status work still depend on the owner.",
  path: "/services/custom-ops-hub",
});

export default function CustomOpsHubPage() {
  return <CustomOpsHubClient />;
}
