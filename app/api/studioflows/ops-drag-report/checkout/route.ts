import { NextRequest, NextResponse } from "next/server";

import {
  buildCheckoutSessionParams,
  createCheckoutIdempotencyKey,
  normalizeCheckoutLead,
} from "@/lib/ops-drag-report/contract";
import { loadOpsDragLead, readLeadEmail } from "@/lib/ops-drag-report/lead-store";
import { createOpsDragStripeClient } from "@/lib/ops-drag-report/stripe-server";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function requestCountry(req: NextRequest): string | null {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry");
  return country?.trim().toUpperCase() || null;
}

export async function POST(req: NextRequest) {
  const country = requestCountry(req);
  const isLocal = req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";
  if (!isLocal && country !== "US") {
    return NextResponse.json({ error: "Ops Drag Report checkout is currently US-only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const leadId = typeof body?.lead_id === "string" ? body.lead_id.trim() : "";
  if (!leadId) return NextResponse.json({ error: "Ops Check lead reference is required" }, { status: 400 });

  try {
    const { client, mode } = createOpsDragStripeClient({ requireCheckoutGate: true });
    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Check lead lookup is not configured");
    const row = await loadOpsDragLead(supabase, leadId);
    const lead = normalizeCheckoutLead({ id: row.id ?? leadId, workEmail: readLeadEmail(row) });
    const params = buildCheckoutSessionParams(lead, req.nextUrl.origin);
    const session = await client.checkout.sessions.create(params, {
      idempotencyKey: createCheckoutIdempotencyKey(lead),
    });

    if (!session.url) throw new Error("Stripe did not return a hosted Checkout URL");
    return NextResponse.json({
      checkout_url: session.url,
      checkout_session_id: session.id,
      mode,
      offer: { amount: 2900, currency: "usd" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Checkout Session";
    const status = message.includes("launch hold") || message.includes("not authorized") ? 423 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
