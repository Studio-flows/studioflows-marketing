export const metadata = { title: "Report delivery | StudioFlows", robots: { index: false, follow: false } };

export default function OpsDragReportCompletePage() {
  return (
    <main className="min-h-screen bg-stone-100 px-5 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-300 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">Checkout return received</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">Payment verification is automatic.</h1>
        <p className="mt-4 leading-7 text-stone-700">
          Stripe sends the payment receipt. StudioFlows sends the Ops Drag Report PDF to the email used at checkout only after the signed paid event is verified.
        </p>
      </div>
    </main>
  );
}
