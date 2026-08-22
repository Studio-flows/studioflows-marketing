import Link from "next/link";

import OpsDragReportCheckout from "./OpsDragReportCheckout";

export const metadata = {
  title: "Ops Drag Report | StudioFlows",
  robots: { index: false, follow: false },
};

export default function OpsDragReportPage({
  searchParams,
}: {
  searchParams?: { lead_id?: string };
}) {
  const leadId = searchParams?.lead_id?.trim() ?? "";
  const enabled = process.env.OPS_DRAG_REPORT_CHECKOUT_ENABLED === "true";

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">Operations Orchestrated</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">Turn your Ops Check into a practical drag report.</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700">
          The report organizes the bottlenecks, handoffs, and ownership gaps already captured in your StudioFlows Ops Check.
        </p>
        {leadId ? (
          <OpsDragReportCheckout leadId={leadId} enabled={enabled} />
        ) : (
          <div className="mt-8 rounded-2xl border border-stone-300 bg-white p-6">
            <p className="text-stone-800">Complete the Ops Check first so the report has verified inputs.</p>
            <Link href="/services/custom-ops-hub" className="mt-4 inline-flex font-semibold text-amber-900 underline underline-offset-4">
              Start the Ops Check
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
