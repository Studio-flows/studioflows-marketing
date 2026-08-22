import {
  OPS_DRAG_CUSTOMER_CONTRACT,
  OPS_DRAG_PRIVACY_DISCLOSURE,
} from "@/lib/ops-drag-report/accepted-contract";
import { resolveCustomerContractRuntime } from "@/lib/ops-drag-report/launch-release.server";

export const runtime = "nodejs";

export const metadata = {
  title: "Ops Drag Report | StudioFlows",
  robots: { index: false, follow: false },
};

export default function OpsDragReportPage() {
  const runtime = resolveCustomerContractRuntime({
    sourceHashesAccepted: false,
    managedPaymentsAccepted: false,
    taxConfigurationAccepted: false,
    providerRuntimeAccepted: false,
    productionReleaseAccepted: false,
    dependencySecurityAccepted: false,
    campaignControlsAccepted: false,
    kiroLaunchReleased: false,
  });

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">Operations Orchestrated</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          {OPS_DRAG_CUSTOMER_CONTRACT.hero}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700">
          {OPS_DRAG_CUSTOMER_CONTRACT.introduction}
        </p>
        <p className="mt-5 text-lg font-semibold text-stone-950">{OPS_DRAG_CUSTOMER_CONTRACT.price}</p>
        {runtime.geography ? <p className="mt-2 text-sm font-medium text-amber-900">{runtime.geography}</p> : null}
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-700">{OPS_DRAG_CUSTOMER_CONTRACT.supportLine}</p>

        <div className="mt-8 rounded-2xl border border-stone-300 bg-white p-6">
          <p className="font-semibold text-stone-900">Launch held</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">
            Purchase and submission actions remain unavailable until every accepted launch-release gate is proven.
          </p>
        </div>

        <section className="mt-12 rounded-2xl border border-stone-300 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-stone-950">What you receive</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-700">
            {OPS_DRAG_CUSTOMER_CONTRACT.receives.map((item) => <li key={item}>• {item}</li>)}
            {runtime.delivery ? <li>• {runtime.delivery.receives}</li> : null}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-stone-300 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-stone-950">How it works</h2>
          <ol className="mt-5 space-y-3 text-sm leading-7 text-stone-700">
            <li>1. {OPS_DRAG_CUSTOMER_CONTRACT.howItWorks[0]}</li>
            {runtime.checkout ? <li>2. {runtime.checkout}</li> : null}
            {runtime.delivery ? <li>3. {runtime.delivery.step}</li> : null}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-stone-300 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-stone-950">What to expect</h2>
          <p className="mt-4 text-sm leading-7 text-stone-700">{OPS_DRAG_CUSTOMER_CONTRACT.expectation}</p>
          {runtime.supportRefund ? <p className="mt-4 text-sm leading-7 text-stone-700">{runtime.supportRefund}</p> : null}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-800/30 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-stone-950">Before you submit the Ops Check</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">{OPS_DRAG_PRIVACY_DISCLOSURE}</p>
        </section>

        <section className="mt-8 rounded-2xl border border-stone-300 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-stone-950">FAQ</h2>
          <div className="mt-5 space-y-6">
            {OPS_DRAG_CUSTOMER_CONTRACT.faq.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-stone-950">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
