import { NextResponse } from "next/server";

import { createOutreachToken } from "@/lib/outreach-link.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.SF_OUTREACH_LINK_SECRET;
  const now = Math.floor(Date.now() / 1000);
  const correlationId = `runtime-probe-${Date.now()}`;
  const token = createOutreachToken(
    {
      destination: "https://os.studioflows.co/s/app",
      message_id: "runtime_probe_message",
      prospect_id: "runtime_probe_prospect",
      campaign_id: "sf_sales_click_tracking_v1",
      experiment_id: "runtime_probe",
      variant_id: "preview",
      correlation_id: correlationId,
      market_cell: "internal",
      vertical: "internal",
      issued_at: now,
      expires_at: now + 900,
    },
    secret
  );

  return NextResponse.json(
    { path: `/r/${token}`, correlation_id: correlationId },
    { headers: { "Cache-Control": "no-store, private, max-age=0" } }
  );
}
