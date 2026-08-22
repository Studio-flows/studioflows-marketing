import type Stripe from "stripe";

import { evaluateFulfillmentSession, hashEmail } from "@/lib/ops-drag-report/contract";
import {
  loadOpsDragLead,
  readFulfillmentReceipt,
  readLeadEmail,
  storeFulfillmentReceipt,
} from "@/lib/ops-drag-report/lead-store";
import { sendPaidOpsDragReport } from "@/lib/ops-drag-report/send-report";
import { createOpsDragStripeClient, readWebhookSecret } from "@/lib/ops-drag-report/stripe-server";
import { buildOpsTeardownSheet, mapLeadRowToTeardownInput } from "@/lib/ops-teardown/build-teardown-sheet";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const FULFILLMENT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Stripe signature is required" }, { status: 400 });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
    return Response.json({ error: "Webhook payload is too large" }, { status: 413 });
  }

  let client: ReturnType<typeof createOpsDragStripeClient>["client"];
  let mode: ReturnType<typeof createOpsDragStripeClient>["mode"];
  let webhookSecret: string;
  try {
    ({ client, mode } = createOpsDragStripeClient());
    webhookSecret = readWebhookSecret();
  } catch {
    return Response.json({ error: "Webhook configuration is unavailable" }, { status: 503 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    if (!FULFILLMENT_EVENTS.has(event.type)) {
      return Response.json({ received: true, state: "ignored", event_type: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.livemode !== (mode === "live")) throw new Error("Stripe mode mismatch");
    const decision = evaluateFulfillmentSession(session);
    if (decision.state !== "fulfill") {
      return Response.json({
        received: true,
        state: decision.state,
        reason: decision.reason,
      });
    }

    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Check lead lookup is not configured");
    const row = await loadOpsDragLead(supabase, decision.leadId);
    if (readLeadEmail(row) !== decision.customerEmail) throw new Error("Checkout delivery email mismatch");

    const prior = readFulfillmentReceipt(row);
    if (prior?.checkout_session_id === session.id) {
      return Response.json({ received: true, state: "duplicate", receipt: prior });
    }

    const sheet = buildOpsTeardownSheet(mapLeadRowToTeardownInput(row, decision.leadId));
    const delivery = await sendPaidOpsDragReport({
      sheet,
      toEmail: decision.customerEmail,
      checkoutSessionId: session.id,
    });
    const receipt = {
      version: "v1",
      state: "fulfilled",
      checkout_session_id: session.id,
      stripe_event_id: event.id,
      customer_email_sha256: hashEmail(decision.customerEmail),
      amount_total: session.amount_total,
      currency: session.currency,
      email_id: delivery.emailId,
      fulfilled_at: new Date().toISOString(),
    };
    await storeFulfillmentReceipt(supabase, row, receipt);
    return Response.json({ received: true, state: "fulfilled", receipt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
