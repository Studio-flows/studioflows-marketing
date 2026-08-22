"use client";

import { useState } from "react";

export default function OpsDragReportCheckout(props: { leadId: string; enabled: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/studioflows/ops-drag-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: props.leadId }),
      });
      const body = (await response.json().catch(() => ({}))) as { checkout_url?: string; error?: string };
      if (!response.ok || !body.checkout_url) throw new Error(body.error || "Checkout is unavailable");
      window.location.assign(body.checkout_url);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Checkout is unavailable");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-stone-300 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">One-time report</p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">StudioFlows Ops Drag Report — $29</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700">
        A fully automated PDF generated from your completed Ops Check. No call, consulting, manual review,
        implementation, or guaranteed outcome is included.
      </p>
      <button
        type="button"
        disabled={!props.enabled || state === "loading"}
        onClick={startCheckout}
        className="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {state === "loading" ? "Opening secure checkout…" : "Buy report for $29"}
      </button>
      {!props.enabled ? (
        <p className="mt-3 text-sm text-amber-900">Checkout is held pending the founder's Managed Payments decision.</p>
      ) : null}
      {state === "error" ? <p className="mt-3 text-sm text-red-800">{message}</p> : null}
      <p className="mt-4 text-xs leading-6 text-stone-600">
        Initial availability is limited to US customers. Payment is completed on Stripe-hosted Checkout.
        Do not submit credentials, card data, regulated data, personal datasets, or confidential exports.
      </p>
    </div>
  );
}
