import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import Stripe from "stripe";

import {
  createDeliveryIdempotencyKey,
  createResendEmailAdapter,
  createStripeRefundAdapter,
  type ProviderEnvironment,
  type ResendTransport,
  type StripeRefundTransport,
} from "../lib/ops-drag-report/provider-adapters.ts";
import {
  assertWebhookSize,
  mapResendWebhook,
  mapStripeRefundWebhook,
  verifyResendWebhook,
  verifyStripeRefundWebhook,
} from "../lib/ops-drag-report/provider-webhooks.ts";
import {
  assertSchedulerRequest,
  runBoundedProviderWorker,
} from "../lib/ops-drag-report/provider-worker.ts";

const disabledEnvironment: ProviderEnvironment = {
  OPS_DRAG_REPORT_PROVIDER_MODE: "test",
  OPS_DRAG_REPORT_PROVIDER_TEST_ENABLED: "false",
  RESEND_API_KEY: "re_fixture",
  OPS_DRAG_REPORT_EMAIL_FROM: "StudioFlows <reports@example.com>",
};
const testEnvironment: ProviderEnvironment = {
  ...disabledEnvironment,
  OPS_DRAG_REPORT_PROVIDER_TEST_ENABLED: "true",
  STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY: "rk_test_fixture",
};

const unusedEmailTransport: ResendTransport = {
  async send() {
    throw new Error("disabled adapter must not call transport");
  },
};
assert.throws(
  () => createResendEmailAdapter({ environment: disabledEnvironment, transport: unusedEmailTransport }),
  /disabled/
);
assert.throws(
  () => createStripeRefundAdapter({
    environment: { ...testEnvironment, STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY: "sk_test_fixture" },
    transport: { async create() { return { id: "re_unused" }; } },
    orderId: "odr_fixture",
    submissionId: "sub_fixture",
  }),
  /restricted key/
);

let emailRequest: Parameters<ResendTransport["send"]>[0] | null = null;
const emailAdapter = createResendEmailAdapter({
  environment: testEnvironment,
  transport: {
    async send(input) {
      emailRequest = input;
      return { id: "msg_fixture", error: null };
    },
  },
});
const emailResult = await emailAdapter.submit({
  orderId: "odr_fixture",
  submissionId: "sub_fixture",
  deliveryEmail: "owner@example.com",
  reportSha256: "a".repeat(64),
  pdfSha256: "b".repeat(64),
  pdfBytes: new TextEncoder().encode("%PDF-1.7 provider fixture"),
  filename: "studioflows-ops-drag-report.pdf",
  attemptNumber: 1,
});
assert.equal(emailResult.providerMessageId, "msg_fixture");
assert.equal(emailRequest?.idempotencyKey, "ops-drag:odr_fixture:delivery:1:v1");
assert.equal(emailRequest?.attachments.length, 1);
assert.equal(emailRequest?.attachments[0].filename, "studioflows-ops-drag-report.pdf");
assert.ok(!emailRequest?.text.includes("http"), "delivery body must not expose a report URL");
assert.deepEqual(emailRequest?.tags, [
  { name: "order_id", value: "odr_fixture" },
  { name: "submission_id", value: "sub_fixture" },
]);
assert.equal(createDeliveryIdempotencyKey("odr_fixture", 3), "ops-drag:odr_fixture:delivery:3:v1");

let refundRequest: Parameters<StripeRefundTransport["create"]>[0] | null = null;
let refundOptions: Parameters<StripeRefundTransport["create"]>[1] | null = null;
const refundAdapter = createStripeRefundAdapter({
  environment: testEnvironment,
  transport: {
    async create(input, options) {
      refundRequest = input;
      refundOptions = options;
      return { id: "re_fixture" };
    },
  },
  orderId: "odr_fixture",
  submissionId: "sub_fixture",
});
const refundResult = await refundAdapter.requestFullRefund({
  checkoutSessionId: "cs_test_fixture",
  paymentReferenceId: "pi_test_fixture",
  remainingRefundableAmount: 2_900,
  currency: "usd",
  idempotencyKey: "ops-drag:cs_test_fixture:refund:v1",
});
assert.equal(refundResult.providerRefundId, "re_fixture");
assert.equal(refundRequest?.amount, 2_900);
assert.equal(refundOptions?.idempotencyKey, "ops-drag:cs_test_fixture:refund:v1");
await assert.rejects(
  () => refundAdapter.requestFullRefund({
    checkoutSessionId: "cs_test_fixture",
    paymentReferenceId: "pi_test_fixture",
    remainingRefundableAmount: 2_901,
    currency: "usd",
    idempotencyKey: "ops-drag:cs_test_fixture:refund:v1",
  }),
  /exceeds/
);

const resendRawBody = JSON.stringify({
  type: "email.delivered",
  created_at: new Date().toISOString(),
  data: {
    email_id: "msg_fixture",
    tags: { order_id: "odr_fixture", submission_id: "sub_fixture" },
  },
});
const svixId = "msg_fixture_event";
const svixTimestamp = String(Math.floor(Date.now() / 1_000));
const resendSecretBytes = Buffer.from("provider-webhook-fixture-key");
const resendSecret = `whsec_${resendSecretBytes.toString("base64")}`;
const resendSignature = `v1,${createHmac("sha256", resendSecretBytes)
  .update(`${svixId}.${svixTimestamp}.${resendRawBody}`)
  .digest("base64")}`;
const resendPayload = verifyResendWebhook({
  rawBody: resendRawBody,
  webhookSecret: resendSecret,
  svixId,
  svixTimestamp,
  svixSignature: resendSignature,
});
const mappedResend = mapResendWebhook(resendPayload, svixId);
assert.equal(mappedResend.event.type, "delivered");
assert.equal(mappedResend.submissionId, "sub_fixture");
assert.throws(() => verifyResendWebhook({
  rawBody: `${resendRawBody} `,
  webhookSecret: resendSecret,
  svixId,
  svixTimestamp,
  svixSignature: resendSignature,
}), /signature/i);
assert.throws(() => assertWebhookSize("x".repeat(65_537), null), /too large/);

const stripeWebhookSecret = "whsec_refund_fixture";
const stripe = new Stripe("rk_test_signature_fixture", {
  apiVersion: "2026-07-29.dahlia",
  telemetry: false,
});
const stripeRawBody = JSON.stringify({
  id: "evt_refund_fixture",
  object: "event",
  api_version: "2026-07-29.dahlia",
  created: 1_780_000_000,
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: "refund.updated",
  data: {
    object: {
      id: "re_fixture",
      object: "refund",
      status: "succeeded",
      metadata: {
        order_id: "odr_fixture",
        submission_id: "sub_fixture",
        checkout_session_id: "cs_test_fixture",
      },
    },
  },
});
const stripeSignature = stripe.webhooks.generateTestHeaderString({
  payload: stripeRawBody,
  secret: stripeWebhookSecret,
});
const stripeEvent = verifyStripeRefundWebhook({
  stripe,
  rawBody: stripeRawBody,
  signature: stripeSignature,
  webhookSecret: stripeWebhookSecret,
});
assert.equal(mapStripeRefundWebhook(stripeEvent).event.type, "refund.succeeded");
const createdEvent = {
  ...stripeEvent,
  type: "refund.created",
} as Stripe.Event;
assert.equal(mapStripeRefundWebhook(createdEvent).event.type, "refund.created");
assert.throws(() => verifyStripeRefundWebhook({
  stripe,
  rawBody: `${stripeRawBody} `,
  signature: stripeSignature,
  webhookSecret: stripeWebhookSecret,
}), /signature/i);

assert.throws(() => assertSchedulerRequest({
  authorization: null,
  expectedSecret: "fixture-worker-secret-at-least-32-bytes",
  enabled: "true",
}), /authorization/);
assert.throws(() => assertSchedulerRequest({
  authorization: "Bearer fixture-worker-secret-at-least-32-bytes",
  expectedSecret: "fixture-worker-secret-at-least-32-bytes",
  enabled: "false",
}), /disabled/);
assertSchedulerRequest({
  authorization: "Bearer fixture-worker-secret-at-least-32-bytes",
  expectedSecret: "fixture-worker-secret-at-least-32-bytes",
  enabled: "true",
});

const workerOwners = new Set<number>();
async function claimWorkerItem(item: number): Promise<"processed" | "noop"> {
  await Promise.resolve();
  if (workerOwners.has(item)) return "noop";
  workerOwners.add(item);
  return "processed";
}
const [wakeOne, wakeTwo] = await Promise.all([
  runBoundedProviderWorker({ loadBatch: async () => [1, 2, 3], process: claimWorkerItem }),
  runBoundedProviderWorker({ loadBatch: async () => [1, 2, 3], process: claimWorkerItem }),
]);
assert.equal(wakeOne.scanned + wakeTwo.scanned, 6);
assert.equal(wakeOne.processed + wakeTwo.processed, 3, "concurrent wakes must yield one owner per item");
assert.equal(wakeOne.noop + wakeTwo.noop, 3);
assert.equal(workerOwners.size, 3);
await assert.rejects(
  () => runBoundedProviderWorker({ loadBatch: async () => [], process: async () => "noop", limit: 11 }),
  /between 1 and 10/
);

console.log(
  "OPS_DRAG_REPORT_PROVIDER_WIRING_PASS email=1 refund=1 resend_signature=PASS stripe_signature=PASS scheduler_owners=3"
);
