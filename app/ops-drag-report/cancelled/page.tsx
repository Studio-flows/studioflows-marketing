import Link from "next/link";

export const metadata = { title: "Checkout cancelled | StudioFlows", robots: { index: false, follow: false } };

export default function OpsDragReportCancelledPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-5 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-300 bg-white p-8">
        <h1 className="text-3xl font-semibold text-stone-950">Checkout cancelled.</h1>
        <p className="mt-4 leading-7 text-stone-700">No report purchase was completed.</p>
        <Link href="/services/custom-ops-hub" className="mt-5 inline-flex font-semibold text-amber-900 underline underline-offset-4">Return to the Ops Check</Link>
      </div>
    </main>
  );
}
