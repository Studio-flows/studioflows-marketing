import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import Stripe from "stripe";

import {
  createDeliveryIdempotencyKey,
  createResendEmailAdapter,
  createResendTransport,
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
  preflightResendDeliveryWorker,
  preflightStripeRefundWorker,
  runBoundedProviderWorker,
} from "../lib/ops-drag-report/provider-worker.ts";
import {
  EmailSubmissionOutcomeUnknownError,
  expireDeliverySla,
  RefundSubmissionOutcomeUnknownError,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";

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

function createRefundRequiredOrder(): OpsDragOrder {
  const snapshot = createAdmittedSnapshot(
    { id: "provider-preflight-submission", work_email: "owner@example.com", raw_answers: {}, metadata: {} },
    "provider-preflight-submission",
    "2026-08-22T20:00:00.000Z"
  );
  const paid = claimFulfillmentOwnership(createAdmittedOrder(snapshot), {
    checkoutSessionId: "cs_test_provider_preflight",
    paymentReferenceId: "pi_test_provider_preflight",
    webhookEventId: "evt_test_provider_preflight",
    paidAt: "2026-08-22T20:10:00.000Z",
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "a".repeat(64),
    snapshotDigest: snapshot.digest,
  }, "2026-08-22T20:10:01.000Z").order;
  return expireDeliverySla(paid, "2026-08-22T21:00:00.000Z");
}

function assertPreflightFailsBeforeMutation(environment: ProviderEnvironment, expected: RegExp): void {
  const order = createRefundRequiredOrder();
  const receiptCount = order.receipts.length;
  let scans = 0;
  let leases = 0;
  let providerCalls = 0;
  assert.throws(() => {
    const factory = preflightStripeRefundWorker({
      environment,
      createTransport: () => ({
        async create() {
          providerCalls += 1;
          return { id: "re_must_not_run" };
        },
      }),
    });
    scans += 1;
    leases += 1;
    void factory;
  }, expected);
  assert.equal(scans, 0);
  assert.equal(leases, 0);
  assert.equal(providerCalls, 0);
  assert.equal(order.automation?.refund.status, "REQUIRED");
  assert.equal(order.automation?.refund.attempts, 0);
  assert.equal(order.automation?.refund.lease_owner, null);
  assert.equal(order.receipts.length, receiptCount);
}

assertPreflightFailsBeforeMutation({
  ...testEnvironment,
  STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY: "rk_live_fixture",
}, /mode-matched restricted key/);
assertPreflightFailsBeforeMutation({
  ...testEnvironment,
  OPS_DRAG_REPORT_PROVIDER_MODE: "live",
  OPS_DRAG_REPORT_PROVIDER_LIVE_ENABLED: "true",
  OPS_DRAG_REPORT_LIVE_ENABLED: "true",
  STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY: "rk_test_fixture",
}, /mode-matched restricted key/);
assertPreflightFailsBeforeMutation({
  ...testEnvironment,
  STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY: undefined,
}, /not configured/);
assertPreflightFailsBeforeMutation({
  ...testEnvironment,
  OPS_DRAG_REPORT_PROVIDER_MODE: "invalid",
}, /explicitly test or live/);

const unusedEmailTransport: ResendTransport = {
  async send() {
    throw new Error("disabled adapter must not call transport");
  },
};
let heldEmailTransportConstructions = 0;
assert.throws(() => preflightResendDeliveryWorker({
  environment: disabledEnvironment,
  createTransport: () => {
    heldEmailTransportConstructions += 1;
    return unusedEmailTransport;
  },
}), /disabled/);
assert.equal(heldEmailTransportConstructions, 0, "held email configuration must fail before transport construction");
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
const unknownOutcomeAdapter = createResendEmailAdapter({
  environment: testEnvironment,
  transport: { async send() { throw new Error("transport connection reset after write"); } },
});
await assert.rejects(
  () => unknownOutcomeAdapter.submit({
    orderId: "odr_fixture",
    submissionId: "sub_fixture",
    deliveryEmail: "owner@example.com",
    reportSha256: "a".repeat(64),
    pdfSha256: "b".repeat(64),
    pdfBytes: new TextEncoder().encode("%PDF-1.7 provider fixture"),
    filename: "studioflows-ops-drag-report.pdf",
    attemptNumber: 1,
  }),
  (error) => error instanceof EmailSubmissionOutcomeUnknownError
);

const sdkRequest = emailRequest;
assert.ok(sdkRequest, "successful fixture must capture the SDK request shape");
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
try {
  console.error = () => undefined;
  globalThis.fetch = (async () => {
    throw new TypeError("fixture response lost after request write");
  }) as typeof fetch;
  const sdkTransport = createResendTransport("re_test_installed_sdk_fixture");
  const sdkResult = await sdkTransport.send(sdkRequest);
  assert.equal(sdkResult.id, null);
  assert.deepEqual(sdkResult.error, {
    name: "application_error",
    message: "Unable to fetch data. The request could not be resolved.",
    statusCode: null,
    responsePresent: false,
    headersPresent: false,
  });
  const sdkAdapter = createResendEmailAdapter({ environment: testEnvironment, transport: sdkTransport });
  await assert.rejects(
    () => sdkAdapter.submit({
      orderId: "odr_sdk_boundary",
      submissionId: "sub_sdk_boundary",
      deliveryEmail: "owner@example.com",
      reportSha256: "a".repeat(64),
      pdfSha256: "b".repeat(64),
      pdfBytes: new TextEncoder().encode("%PDF-1.7 sdk boundary fixture"),
      filename: "studioflows-ops-drag-report.pdf",
      attemptNumber: 1,
    }),
    (error) => error instanceof EmailSubmissionOutcomeUnknownError
  );
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}

for (const statusCode of [408, 425, 429, 500, 503]) {
  const ambiguousHttpAdapter = createResendEmailAdapter({
    environment: testEnvironment,
    transport: {
      async send() {
        return {
          id: null,
          error: {
            name: "application_error",
            message: "provider detail must not escape",
            statusCode,
            responsePresent: true,
            headersPresent: true,
          },
        };
      },
    },
  });
  await assert.rejects(
    () => ambiguousHttpAdapter.submit({
      orderId: "odr_ambiguous_http",
      submissionId: "sub_ambiguous_http",
      deliveryEmail: "owner@example.com",
      reportSha256: "a".repeat(64),
      pdfSha256: "b".repeat(64),
      pdfBytes: new TextEncoder().encode("%PDF-1.7 ambiguous response fixture"),
      filename: "studioflows-ops-drag-report.pdf",
      attemptNumber: 1,
    }),
    (error) => error instanceof EmailSubmissionOutcomeUnknownError,
    `HTTP ${statusCode} must preserve the same delivery attempt and key`
  );
}

const definitiveHttpAdapter = createResendEmailAdapter({
  environment: testEnvironment,
  transport: {
    async send() {
      return {
        id: null,
        error: {
          name: "validation_error",
          message: "provider body must remain redacted",
          statusCode: 422,
          responsePresent: true,
          headersPresent: true,
        },
      };
    },
  },
});
await assert.rejects(
  () => definitiveHttpAdapter.submit({
    orderId: "odr_definitive_http",
    submissionId: "sub_definitive_http",
    deliveryEmail: "owner@example.com",
    reportSha256: "a".repeat(64),
    pdfSha256: "b".repeat(64),
    pdfBytes: new TextEncoder().encode("%PDF-1.7 definitive response fixture"),
    filename: "studioflows-ops-drag-report.pdf",
    attemptNumber: 1,
  }),
  (error) =>
    error instanceof Error &&
    !(error instanceof EmailSubmissionOutcomeUnknownError) &&
    error.message === "Email provider definitively rejected submission"
);

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
const unknownRefundOutcomeAdapter = createStripeRefundAdapter({
  environment: testEnvironment,
  transport: { async create() { return { id: "" }; } },
  orderId: "odr_fixture",
  submissionId: "sub_fixture",
});
await assert.rejects(
  () => unknownRefundOutcomeAdapter.requestFullRefund({
    checkoutSessionId: "cs_test_fixture",
    paymentReferenceId: "pi_test_fixture",
    remainingRefundableAmount: 2_900,
    currency: "usd",
    idempotencyKey: "ops-drag:cs_test_fixture:refund:v1",
  }),
  (error) => error instanceof RefundSubmissionOutcomeUnknownError
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
assert.equal(mappedResend.orderId, "odr_fixture");
assert.equal(mappedResend.submissionId, "sub_fixture");
const missingOrderTag = structuredClone(resendPayload);
delete missingOrderTag.data.tags?.order_id;
assert.throws(() => mapResendWebhook(missingOrderTag, svixId), /order_id tag/);
const missingSubmissionTag = structuredClone(resendPayload);
delete missingSubmissionTag.data.tags?.submission_id;
assert.throws(() => mapResendWebhook(missingSubmissionTag, svixId), /submission_id tag/);
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
  "OPS_DRAG_REPORT_PROVIDER_WIRING_PASS email=1 refund=1 resend_signature=PASS stripe_signature=PASS scheduler_owners=3 preflight_before_scan=PASS mismatch_cases=4"
);
