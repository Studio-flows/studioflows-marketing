import type Stripe from "stripe";

import {
  evaluateFulfillmentSession,
  hashEmail,
  readFulfillmentSubmissionId,
} from "@/lib/ops-drag-report/contract";
import { claimOpsDragFulfillment, loadOpsDragOrder } from "@/lib/ops-drag-report/order-store";
import { createOpsDragStripeClient, readWebhookSecret } from "@/lib/ops-drag-report/stripe-server";
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
    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Check order storage is not configured");
    const submissionId = readFulfillmentSubmissionId(session);
    const order = await loadOpsDragOrder(supabase, submissionId);
    const decision = evaluateFulfillmentSession(session, {
      orderId: order.order_id,
      submissionId: order.submission_id,
      snapshotDigest: order.snapshot.digest,
      deliveryEmail: order.snapshot.delivery_email,
    });
    if (decision.state !== "fulfill") {
      return Response.json({
        received: true,
        state: decision.state,
        reason: decision.reason,
      });
    }

    const transition = await claimOpsDragFulfillment(
      supabase,
      decision.submissionId,
      {
        checkoutSessionId: session.id,
        paymentReferenceId: decision.paymentReferenceId,
        webhookEventId: event.id,
        paidAt: decision.paidAt,
        amountTotal: session.amount_total ?? 0,
        currency: "usd",
        customerEmailSha256: hashEmail(decision.customerEmail),
        snapshotDigest: decision.snapshotDigest,
      },
      new Date(event.created * 1_000).toISOString()
    );
    return Response.json({
      received: true,
      state: transition.disposition === "acquired" ? "fulfillment_owned" : "duplicate",
      order_id: transition.order.order_id,
      lease_owner: transition.leaseOwner,
      receipt: transition.order.receipts.at(-1) ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
