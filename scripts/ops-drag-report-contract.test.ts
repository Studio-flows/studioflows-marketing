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
import {
  createAdmittedOrder,
  createAdmittedSnapshot,
  verifyReceiptChain,
} from "../lib/ops-drag-report/order-foundation.ts";

const lead = {
  id: "f53f4be4-04f6-4bb0-a145-72f37bb2f1de",
  workEmail: "owner@example.com",
};
const snapshot = createAdmittedSnapshot(
  {
    id: lead.id,
    work_email: lead.workEmail,
    company_name: "Example Operations",
    primary_pain_area: "Handoffs",
    raw_answers: {},
    metadata: {},
  },
  lead.id,
  "2026-08-22T20:00:00.000Z"
);
const order = createAdmittedOrder(snapshot);
const binding = {
  orderId: order.order_id,
  submissionId: order.submission_id,
  snapshotDigest: order.snapshot.digest,
  deliveryEmail: order.snapshot.delivery_email,
};
const params = buildCheckoutSessionParams(lead, "https://preview.example.com", binding);

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
assert.equal(createCheckoutIdempotencyKey(lead.id), `ops-drag:${lead.id}:checkout:v1`);
assert.equal(params.metadata?.intake_digest, snapshot.digest);
assert.equal(params.metadata?.order_id, order.order_id);
assert.equal(params.metadata?.cadence, "ONE_TIME");
assert.equal(params.metadata?.quantity, "1");
assert.ok(verifyReceiptChain(order));
assert.ok(!JSON.stringify(order.receipts).includes(lead.workEmail));

const paidSession = {
  id: "cs_test_contract",
  mode: "payment",
  client_reference_id: lead.id,
  payment_intent: "pi_test_contract",
  created: 1_780_000_000,
  amount_total: 2900,
  currency: "usd",
  payment_status: "paid",
  metadata: {
    offer_id: "studioflows_ops_drag_report",
    offer_version: "v1",
    lead_id: lead.id,
    submission_id: lead.id,
    order_id: order.order_id,
    intake_digest: snapshot.digest,
    cadence: "ONE_TIME",
    quantity: "1",
  },
  customer_details: { email: lead.workEmail, address: { country: "US" } },
} as unknown as Stripe.Checkout.Session;

assert.deepEqual(evaluateFulfillmentSession(paidSession, binding), {
  state: "fulfill",
  submissionId: lead.id,
  customerEmail: lead.workEmail,
  paymentReferenceId: "pi_test_contract",
  paidAt: new Date(1_780_000_000_000).toISOString(),
  snapshotDigest: snapshot.digest,
});
assert.deepEqual(
  evaluateFulfillmentSession({ ...paidSession, payment_status: "unpaid" } as Stripe.Checkout.Session, binding),
  { state: "pending", reason: "payment_not_paid" }
);
assert.deepEqual(
  evaluateFulfillmentSession({
    ...paidSession,
    customer_details: { email: lead.workEmail, address: { country: "CA" } },
  } as Stripe.Checkout.Session, binding),
  { state: "reject", reason: "customer_country_not_us" }
);
assert.deepEqual(
  evaluateFulfillmentSession({ ...paidSession, mode: "subscription" } as Stripe.Checkout.Session, binding),
  { state: "reject", reason: "session_mode_mismatch" }
);
assert.deepEqual(
  evaluateFulfillmentSession({
    ...paidSession,
    metadata: { ...paidSession.metadata, intake_digest: "0".repeat(64) },
  } as Stripe.Checkout.Session, binding),
  { state: "reject", reason: "snapshot_digest_mismatch" }
);

function expectRejection(candidate: Record<string, unknown>, reason: string): void {
  assert.deepEqual(
    evaluateFulfillmentSession(candidate as unknown as Stripe.Checkout.Session, binding),
    { state: "reject", reason }
  );
}

expectRejection(
  { ...paidSession, metadata: { ...paidSession.metadata, offer_id: "different_offer" } },
  "offer_mismatch"
);
expectRejection(
  { ...paidSession, metadata: { ...paidSession.metadata, offer_version: "v2" } },
  "offer_version_mismatch"
);
expectRejection(
  { ...paidSession, metadata: { ...paidSession.metadata, cadence: "RECURRING" } },
  "one_time_product_binding_mismatch"
);
expectRejection({ ...paidSession, client_reference_id: "00000000-0000-4000-8000-000000000000" }, "client_reference_mismatch");
expectRejection(
  { ...paidSession, metadata: { ...paidSession.metadata, submission_id: "00000000-0000-4000-8000-000000000000" } },
  "submission_reference_mismatch"
);
expectRejection(
  { ...paidSession, metadata: { ...paidSession.metadata, order_id: "odr_00000000000000000000000000000000" } },
  "order_reference_mismatch"
);
expectRejection({ ...paidSession, amount_total: 2_901 }, "amount_mismatch");
expectRejection({ ...paidSession, currency: "cad" }, "currency_mismatch");
expectRejection(
  { ...paidSession, customer_details: { email: "other@example.com", address: { country: "US" } } },
  "customer_email_mismatch"
);
expectRejection({ ...paidSession, payment_intent: null }, "payment_reference_missing");
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
