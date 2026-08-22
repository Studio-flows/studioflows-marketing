import { createHash } from "node:crypto";

import type Stripe from "stripe";

export const OPS_DRAG_REPORT_OFFER_ID = "studioflows_ops_drag_report";
export const OPS_DRAG_REPORT_OFFER_VERSION = "v1";
export const OPS_DRAG_REPORT_AMOUNT_CENTS = 2_900;
export const OPS_DRAG_REPORT_CURRENCY = "usd";
export const OPS_DRAG_REPORT_TAX_CODE = "txcd_10701410";
export const OPS_DRAG_REPORT_INTEGRATION_IDENTIFIER = "qmvktsra";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CheckoutLead = {
  id: string;
  workEmail: string;
};

export type CheckoutOrderBinding = {
  orderId: string;
  submissionId: string;
  snapshotDigest: string;
};

export type ExpectedFulfillmentBinding = CheckoutOrderBinding & {
  deliveryEmail: string;
};

export type FulfillmentDecision =
  | {
      state: "fulfill";
      submissionId: string;
      customerEmail: string;
      paymentReferenceId: string;
      paidAt: string;
      snapshotDigest: string;
    }
  | { state: "pending"; reason: "payment_not_paid" }
  | { state: "reject"; reason: string };

function normalizeOrigin(origin: string): string {
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Checkout return origin must use HTTPS");
  }
  return parsed.origin;
}

export function normalizeCheckoutLead(input: CheckoutLead): CheckoutLead {
  const id = input.id.trim();
  const workEmail = input.workEmail.trim().toLowerCase();
  if (!UUID_PATTERN.test(id)) throw new Error("A valid Ops Check lead reference is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    throw new Error("A valid report delivery email is required");
  }
  return { id, workEmail };
}

export function createCheckoutIdempotencyKey(submissionId: string): string {
  const normalized = submissionId.trim();
  if (!UUID_PATTERN.test(normalized)) throw new Error("A valid submission reference is required");
  return `ops-drag:${normalized}:checkout:v1`;
}

export function checkoutCountryGateStatus(country: string | null, isLocal: boolean): 403 | null {
  const normalized = country?.trim().toUpperCase() || null;
  return !isLocal && normalized !== "US" ? 403 : null;
}

export function buildCheckoutSessionParams(
  lead: CheckoutLead,
  returnOrigin: string,
  binding: CheckoutOrderBinding
): Stripe.Checkout.SessionCreateParams {
  const normalized = normalizeCheckoutLead(lead);
  const origin = normalizeOrigin(returnOrigin);
  if (binding.submissionId !== normalized.id) throw new Error("Checkout submission binding mismatch");
  if (!/^[a-f0-9]{64}$/.test(binding.snapshotDigest)) throw new Error("Checkout snapshot digest is invalid");
  if (!/^odr_[a-f0-9]{32}$/.test(binding.orderId)) throw new Error("Checkout order binding is invalid");

  return {
    mode: "payment",
    managed_payments: { enabled: true },
    integration_identifier: OPS_DRAG_REPORT_INTEGRATION_IDENTIFIER,
    customer_email: normalized.workEmail,
    client_reference_id: normalized.id,
    billing_address_collection: "required",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: OPS_DRAG_REPORT_CURRENCY,
          unit_amount: OPS_DRAG_REPORT_AMOUNT_CENTS,
          product_data: {
            name: "StudioFlows Ops Drag Report",
            description: "A fully automated report generated from your StudioFlows Ops Check.",
            tax_code: OPS_DRAG_REPORT_TAX_CODE,
          },
        },
      },
    ],
    metadata: {
      offer_id: OPS_DRAG_REPORT_OFFER_ID,
      offer_version: OPS_DRAG_REPORT_OFFER_VERSION,
      lead_id: normalized.id,
      submission_id: binding.submissionId,
      order_id: binding.orderId,
      intake_digest: binding.snapshotDigest,
      cadence: "ONE_TIME",
      quantity: "1",
      fulfillment_contract: "ops_drag_report_email_v1",
      market: "US",
    },
    success_url: `${origin}/ops-drag-report/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/ops-drag-report/cancelled`,
  };
}

function readCustomerCountry(session: Stripe.Checkout.Session): string | null {
  const billingCountry = session.customer_details?.address?.country;
  if (billingCountry) return billingCountry.toUpperCase();

  const shippingCountry = session.collected_information?.shipping_details?.address?.country;
  return shippingCountry ? shippingCountry.toUpperCase() : null;
}

function readPaymentReference(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  if (session.payment_intent && typeof session.payment_intent.id === "string") return session.payment_intent.id;
  return null;
}

export function readFulfillmentSubmissionId(session: Stripe.Checkout.Session): string {
  const submissionId = session.metadata?.submission_id?.trim() ?? "";
  if (!UUID_PATTERN.test(submissionId)) throw new Error("Webhook submission reference is invalid");
  return submissionId;
}

export function evaluateFulfillmentSession(
  session: Stripe.Checkout.Session,
  expected: ExpectedFulfillmentBinding
): FulfillmentDecision {
  if (session.mode !== "payment") return { state: "reject", reason: "session_mode_mismatch" };
  if (session.metadata?.offer_id !== OPS_DRAG_REPORT_OFFER_ID) {
    return { state: "reject", reason: "offer_mismatch" };
  }
  if (session.metadata?.offer_version !== OPS_DRAG_REPORT_OFFER_VERSION) {
    return { state: "reject", reason: "offer_version_mismatch" };
  }
  if (session.metadata?.cadence !== "ONE_TIME" || session.metadata?.quantity !== "1") {
    return { state: "reject", reason: "one_time_product_binding_mismatch" };
  }
  if (session.client_reference_id !== expected.submissionId) {
    return { state: "reject", reason: "client_reference_mismatch" };
  }
  if (session.metadata?.submission_id !== expected.submissionId || session.metadata?.lead_id !== expected.submissionId) {
    return { state: "reject", reason: "submission_reference_mismatch" };
  }
  if (session.metadata?.order_id !== expected.orderId) {
    return { state: "reject", reason: "order_reference_mismatch" };
  }
  if (session.metadata?.intake_digest !== expected.snapshotDigest) {
    return { state: "reject", reason: "snapshot_digest_mismatch" };
  }
  if (session.amount_total !== OPS_DRAG_REPORT_AMOUNT_CENTS) {
    return { state: "reject", reason: "amount_mismatch" };
  }
  if (session.currency?.toLowerCase() !== OPS_DRAG_REPORT_CURRENCY) {
    return { state: "reject", reason: "currency_mismatch" };
  }
  if (session.payment_status !== "paid") {
    return { state: "pending", reason: "payment_not_paid" };
  }

  const customerEmail = session.customer_details?.email?.trim().toLowerCase() ?? "";
  if (!customerEmail) return { state: "reject", reason: "customer_email_missing" };
  if (customerEmail !== expected.deliveryEmail.trim().toLowerCase()) {
    return { state: "reject", reason: "customer_email_mismatch" };
  }

  if (readCustomerCountry(session) !== "US") {
    return { state: "reject", reason: "customer_country_not_us" };
  }

  const paymentReferenceId = readPaymentReference(session);
  if (!paymentReferenceId) return { state: "reject", reason: "payment_reference_missing" };
  if (typeof session.created !== "number" || !Number.isFinite(session.created)) {
    return { state: "reject", reason: "paid_timestamp_missing" };
  }

  return {
    state: "fulfill",
    submissionId: expected.submissionId,
    customerEmail,
    paymentReferenceId,
    paidAt: new Date(session.created * 1_000).toISOString(),
    snapshotDigest: expected.snapshotDigest,
  };
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
