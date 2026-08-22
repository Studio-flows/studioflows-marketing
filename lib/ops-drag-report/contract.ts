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

export type FulfillmentDecision =
  | { state: "fulfill"; leadId: string; customerEmail: string }
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

export function createIntakeDigest(lead: CheckoutLead): string {
  const normalized = normalizeCheckoutLead(lead);
  return createHash("sha256")
    .update(`${normalized.id}|${OPS_DRAG_REPORT_OFFER_VERSION}`)
    .digest("hex");
}

export function createCheckoutIdempotencyKey(lead: CheckoutLead): string {
  return `ops-drag-report-${OPS_DRAG_REPORT_OFFER_VERSION}-${createIntakeDigest(lead).slice(0, 32)}`;
}

export function buildCheckoutSessionParams(
  lead: CheckoutLead,
  returnOrigin: string
): Stripe.Checkout.SessionCreateParams {
  const normalized = normalizeCheckoutLead(lead);
  const origin = normalizeOrigin(returnOrigin);
  const intakeDigest = createIntakeDigest(normalized);

  return {
    mode: "payment",
    managed_payments: { enabled: true },
    integration_identifier: OPS_DRAG_REPORT_INTEGRATION_IDENTIFIER,
    customer_email: normalized.workEmail,
    client_reference_id: normalized.id,
    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["US"] },
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
      intake_digest: intakeDigest,
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

export function evaluateFulfillmentSession(
  session: Stripe.Checkout.Session
): FulfillmentDecision {
  if (session.metadata?.offer_id !== OPS_DRAG_REPORT_OFFER_ID) {
    return { state: "reject", reason: "offer_mismatch" };
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

  const leadId = session.metadata?.lead_id?.trim() ?? "";
  if (!UUID_PATTERN.test(leadId)) {
    return { state: "reject", reason: "lead_reference_invalid" };
  }

  const customerEmail = session.customer_details?.email?.trim().toLowerCase() ?? "";
  if (!customerEmail) return { state: "reject", reason: "customer_email_missing" };

  if (readCustomerCountry(session) !== "US") {
    return { state: "reject", reason: "customer_country_not_us" };
  }

  return { state: "fulfill", leadId, customerEmail };
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
