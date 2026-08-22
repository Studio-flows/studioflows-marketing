import { Resend } from "resend";
import type Stripe from "stripe";

import type {
  EmailProviderEvent,
  RefundProviderEvent,
} from "./delivery-refund-state-machine.ts";

export const OPS_DRAG_PROVIDER_WEBHOOK_MAX_BYTES = 65_536;

type VerifiedResendPayload = {
  type: string;
  created_at: string;
  data: { email_id: string; tags?: Record<string, string> };
};

type VerifiedStripeRefundPayload = {
  id: string;
  status: string | null;
  metadata: Record<string, string>;
};

export type BoundEmailProviderEvent = {
  event: EmailProviderEvent;
  submissionId: string;
  recordedAt: string;
};

export type BoundRefundProviderEvent = {
  event: RefundProviderEvent;
  orderId: string;
  submissionId: string;
  checkoutSessionId: string;
  recordedAt: string;
};

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

export function assertWebhookSize(rawBody: string, contentLength: string | null): void {
  const declared = Number(contentLength ?? "0");
  if (
    (Number.isFinite(declared) && declared > OPS_DRAG_PROVIDER_WEBHOOK_MAX_BYTES) ||
    Buffer.byteLength(rawBody, "utf8") > OPS_DRAG_PROVIDER_WEBHOOK_MAX_BYTES
  ) {
    throw new Error("Webhook payload is too large");
  }
}

export function verifyResendWebhook(input: {
  rawBody: string;
  webhookSecret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}): VerifiedResendPayload {
  if (!input.webhookSecret.startsWith("whsec_")) throw new Error("Resend webhook secret is invalid");
  const resend = new Resend("re_signature_verification_only");
  return resend.webhooks.verify({
    payload: input.rawBody,
    webhookSecret: input.webhookSecret,
    headers: {
      id: requireString(input.svixId, "svix-id"),
      timestamp: requireString(input.svixTimestamp, "svix-timestamp"),
      signature: requireString(input.svixSignature, "svix-signature"),
    },
  }) as VerifiedResendPayload;
}

export function mapResendWebhook(payload: VerifiedResendPayload, eventId: string): BoundEmailProviderEvent {
  const typeMap: Record<string, EmailProviderEvent["type"]> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.bounced": "hard_bounce",
    "email.failed": "failed",
    "email.suppressed": "hard_bounce",
  };
  const mapped = typeMap[payload.type];
  if (!mapped) throw new Error("Resend event type is not allowlisted");
  return {
    submissionId: requireString(payload.data.tags?.submission_id, "submission_id tag"),
    recordedAt: new Date(requireString(payload.created_at, "created_at")).toISOString(),
    event: {
      eventId: requireString(eventId, "Resend event ID"),
      providerMessageId: requireString(payload.data.email_id, "email_id"),
      type: mapped,
    },
  };
}

export function verifyStripeRefundWebhook(input: {
  stripe: Stripe;
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): Stripe.Event {
  if (!input.webhookSecret.startsWith("whsec_")) throw new Error("Stripe refund webhook secret is invalid");
  return input.stripe.webhooks.constructEvent(input.rawBody, input.signature, input.webhookSecret);
}

export function mapStripeRefundWebhook(event: Stripe.Event): BoundRefundProviderEvent {
  if (!new Set(["refund.created", "refund.updated", "refund.failed"]).has(event.type)) {
    throw new Error("Stripe refund event type is not allowlisted");
  }
  const refund = event.data.object as VerifiedStripeRefundPayload;
  let type: RefundProviderEvent["type"];
  if (event.type === "refund.created") {
    type = "refund.created";
  } else if (event.type === "refund.failed" || refund.status === "failed" || refund.status === "canceled") {
    type = "refund.failed";
  } else if (refund.status === "succeeded") {
    type = "refund.succeeded";
  } else {
    type = "refund.pending";
  }
  return {
    orderId: requireString(refund.metadata?.order_id, "order_id metadata"),
    submissionId: requireString(refund.metadata?.submission_id, "submission_id metadata"),
    checkoutSessionId: requireString(refund.metadata?.checkout_session_id, "checkout_session_id metadata"),
    recordedAt: new Date(event.created * 1_000).toISOString(),
    event: {
      eventId: requireString(event.id, "Stripe event ID"),
      providerRefundId: requireString(refund.id, "refund ID"),
      type,
    },
  };
}
