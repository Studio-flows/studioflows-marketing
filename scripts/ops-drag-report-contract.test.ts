import assert from "node:assert/strict";

import Stripe from "stripe";

import {
  OPS_DRAG_REPORT_AMOUNT_CENTS,
  OPS_DRAG_REPORT_TAX_CODE,
  buildCheckoutSessionParams,
  createCheckoutIdempotencyKey,
  evaluateFulfillmentSession,
  hashEmail,
} from "../lib/ops-drag-report/contract.ts";

const lead = {
  id: "f53f4be4-04f6-4bb0-a145-72f37bb2f1de",
  workEmail: "owner@example.com",
};
const params = buildCheckoutSessionParams(lead, "https://preview.example.com");

assert.equal(params.mode, "payment");
assert.deepEqual(params.managed_payments, { enabled: true });
assert.equal(params.customer_email, lead.workEmail);
assert.equal(params.line_items?.[0]?.price_data?.unit_amount, OPS_DRAG_REPORT_AMOUNT_CENTS);
assert.equal(params.line_items?.[0]?.price_data?.product_data?.tax_code, OPS_DRAG_REPORT_TAX_CODE);
assert.deepEqual(params.shipping_address_collection?.allowed_countries, ["US"]);
assert.equal(params.billing_address_collection, "required");
assert.ok(!("payment_method_types" in params), "dynamic payment methods must remain enabled");
assert.ok(!("automatic_tax" in params), "Managed Payments owns tax calculation");
assert.ok(!JSON.stringify(params.metadata).includes(lead.workEmail), "metadata must not contain raw email");
assert.equal(createCheckoutIdempotencyKey(lead), createCheckoutIdempotencyKey(lead));

const paidSession = {
  id: "cs_test_contract",
  amount_total: 2900,
  currency: "usd",
  payment_status: "paid",
  metadata: { offer_id: "studioflows_ops_drag_report", lead_id: lead.id },
  customer_details: { email: lead.workEmail, address: { country: "US" } },
} as Stripe.Checkout.Session;

assert.deepEqual(evaluateFulfillmentSession(paidSession), {
  state: "fulfill",
  leadId: lead.id,
  customerEmail: lead.workEmail,
});
assert.deepEqual(
  evaluateFulfillmentSession({ ...paidSession, payment_status: "unpaid" } as Stripe.Checkout.Session),
  { state: "pending", reason: "payment_not_paid" }
);
assert.deepEqual(
  evaluateFulfillmentSession({
    ...paidSession,
    customer_details: { email: lead.workEmail, address: { country: "CA" } },
  } as Stripe.Checkout.Session),
  { state: "reject", reason: "customer_country_not_us" }
);
assert.notEqual(hashEmail(lead.workEmail), lead.workEmail);

const webhookSecret = "whsec_preview_contract_only";
const webhookPayload = JSON.stringify({
  id: "evt_preview_contract",
  object: "event",
  api_version: "2026-07-29.dahlia",
  created: 1_780_000_000,
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: "checkout.session.completed",
  data: { object: paidSession },
});
const stripe = new Stripe("rk_test_preview_contract_only", {
  apiVersion: "2026-07-29.dahlia",
  telemetry: false,
});
const signature = stripe.webhooks.generateTestHeaderString({
  payload: webhookPayload,
  secret: webhookSecret,
});
const verifiedEvent = stripe.webhooks.constructEvent(webhookPayload, signature, webhookSecret);
assert.equal(verifiedEvent.id, "evt_preview_contract");
assert.throws(() => stripe.webhooks.constructEvent(`${webhookPayload} `, signature, webhookSecret));

console.log("OPS_DRAG_REPORT_CONTRACT_PASS");
