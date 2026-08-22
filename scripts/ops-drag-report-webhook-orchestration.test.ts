import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  admitPaidNonUsAutomaticRefund,
  applyRefundProviderEvent,
  claimRefundAttempt,
  countsAsVerifiedFirstSale,
  startGenerationAttempt,
  type EmailProviderAdapter,
  type RefundProviderAdapter,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import { createDeterministicReportGenerationAdapter } from "../lib/ops-drag-report/deterministic-report.ts";
import {
  orchestratePaidOpsDragFulfillment,
  type PaidFulfillmentOrderStore,
} from "../lib/ops-drag-report/paid-fulfillment-orchestrator.ts";
import { processPaidFulfillmentWorkerOrder } from "../lib/ops-drag-report/paid-fulfillment-worker.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  verifyReceiptChain,
  type OpsDragOrder,
  type OpsDragPaymentAdmission,
} from "../lib/ops-drag-report/order-foundation.ts";

const PAID_AT = "2026-08-22T20:00:00.000Z";
const WEBHOOK_AT = "2026-08-22T20:01:00.000Z";
const PRIVATE_ANSWER = "handoffs wait on one internal owner";
const DELIVERY_EMAIL = "buyer@example.com";

function createOrder(id: string): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({
    id,
    work_email: DELIVERY_EMAIL,
    raw_answers: {
      primaryPainArea: PRIVATE_ANSWER,
      highestCostBottleneck: "intake handoffs",
      frequentBreakdown: "missing context",
      workflowManagement: "task lists",
      quarterRisk: "delivery visibility",
    },
    metadata: {},
  }, id, "2026-08-22T19:50:00.000Z");
  return createAdmittedOrder(snapshot);
}

function paymentFor(order: OpsDragOrder, eventId: string): OpsDragPaymentAdmission {
  return {
    checkoutSessionId: `cs_test_${order.submission_id}`,
    paymentReferenceId: `pi_test_${order.submission_id}`,
    webhookEventId: eventId,
    paidAt: PAID_AT,
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "c".repeat(64),
    snapshotDigest: order.snapshot.digest,
  };
}

class AtomicOrderStore implements PaidFulfillmentOrderStore {
  private order: OpsDragOrder;
  private serial: Promise<void> = Promise.resolve();

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async load(): Promise<OpsDragOrder> {
    await this.serial;
    return structuredClone(this.order);
  }

  async transition(apply: (order: OpsDragOrder) => OpsDragOrder): Promise<OpsDragOrder> {
    let result: OpsDragOrder | null = null;
    this.serial = this.serial.then(() => {
      this.order = structuredClone(apply(structuredClone(this.order)));
      result = structuredClone(this.order);
    });
    await this.serial;
    return result!;
  }
}

const generationAdapter = createDeterministicReportGenerationAdapter();
const unusedRefundAdapter: RefundProviderAdapter = {
  async requestFullRefund() {
    throw new Error("refund path must remain unused in this fixture");
  },
};

const routeSource = readFileSync("app/api/studioflows/ops-drag-report/webhook/route.ts", "utf8");
assert.ok(routeSource.includes("client.webhooks.constructEvent(rawBody, signature, webhookSecret)"));
assert.ok(routeSource.includes("createEmailAdapter: () => preflightResendDeliveryWorker({"));
assert.equal(routeSource.includes("const emailAdapter = preflightResendDeliveryWorker({"), false);

const failingAdmitted = createOrder("webhook-config-failure");
const failingPayment = paymentFor(failingAdmitted, "evt_signed_payment_config_failure");
const failingOwnership = claimFulfillmentOwnership(failingAdmitted, failingPayment, PAID_AT);
assert.equal(failingOwnership.disposition, "acquired");
const failingStore = new AtomicOrderStore(failingOwnership.order);
let providerCalls = 0;
let adapterFactoryCalls = 0;
const createBrokenEmailAdapter = (): EmailProviderAdapter => {
  adapterFactoryCalls += 1;
  throw new Error("Resend sender configuration is unavailable");
};

const webhookAttempt = await orchestratePaidOpsDragFulfillment({
  store: failingStore,
  generationAdapter,
  createEmailAdapter: createBrokenEmailAdapter,
  recordedAt: WEBHOOK_AT,
});
assert.equal(webhookAttempt.disposition, "DELIVERY_RETRYABLE");
for (let attempt = 2; attempt <= 3; attempt += 1) {
  const recovery = await processPaidFulfillmentWorkerOrder({
    store: failingStore,
    generationAdapter,
    createEmailAdapter: createBrokenEmailAdapter,
    createRefundAdapter: () => unusedRefundAdapter,
    recordedAt: `2026-08-22T20:0${attempt}:00.000Z`,
  });
  assert.equal(recovery, "blocked");
}
const exhausted = await failingStore.load();
assert.equal(exhausted.automation?.delivery.status, "FAILED");
assert.equal(exhausted.automation?.delivery.attempts, 3);
assert.equal(exhausted.automation?.refund.status, "REQUIRED");
assert.equal(adapterFactoryCalls, 3);
assert.equal(providerCalls, 0);
assert.equal(
  exhausted.automation?.attempts.filter((attempt) =>
    attempt.failure_code === "EMAIL_PROVIDER_CONFIGURATION_FAILED"
  ).length,
  3
);
assert.equal(
  exhausted.receipts.filter((receipt) => receipt.kind === "DELIVERY_ATTEMPT_RECORDED").length,
  6
);
const redactedReceipts = JSON.stringify(exhausted.receipts);
assert.equal(redactedReceipts.includes(DELIVERY_EMAIL), false);
assert.equal(redactedReceipts.includes(PRIVATE_ANSWER), false);
assert.ok(verifyReceiptChain(exhausted));

const successfulAdmitted = createOrder("webhook-duplicate-payment");
const successfulPayment = paymentFor(successfulAdmitted, "evt_signed_payment_success");
const successfulOwnership = claimFulfillmentOwnership(successfulAdmitted, successfulPayment, PAID_AT);
const successfulStore = new AtomicOrderStore(successfulOwnership.order);
let acceptedEmailSends = 0;
const acceptedEmail: EmailProviderAdapter = {
  async submit(input) {
    acceptedEmailSends += 1;
    return { providerMessageId: `msg_${input.orderId}_${input.attemptNumber}` };
  },
};
const firstDelivery = await orchestratePaidOpsDragFulfillment({
  store: successfulStore,
  generationAdapter,
  createEmailAdapter: () => acceptedEmail,
  recordedAt: WEBHOOK_AT,
});
assert.equal(firstDelivery.disposition, "DELIVERY_SUBMITTED");
const firstLeaseOwner = firstDelivery.order.automation?.delivery.submission_lease_owner;

const duplicatePayment = claimFulfillmentOwnership(
  await successfulStore.load(),
  successfulPayment,
  "2026-08-22T20:01:30.000Z"
);
assert.equal(duplicatePayment.disposition, "duplicate");
await successfulStore.transition(() => duplicatePayment.order);
const duplicateDelivery = await orchestratePaidOpsDragFulfillment({
  store: successfulStore,
  generationAdapter,
  createEmailAdapter: () => acceptedEmail,
  recordedAt: "2026-08-22T20:01:31.000Z",
});
assert.equal(duplicateDelivery.disposition, "ALREADY_SUBMITTED");
assert.equal(acceptedEmailSends, 1);
assert.equal(duplicateDelivery.order.automation?.delivery.attempts, 1);
assert.equal(duplicateDelivery.order.automation?.delivery.submission_lease_owner, firstLeaseOwner);
assert.ok(verifyReceiptChain(duplicateDelivery.order));

const nonUsAdmitted = createOrder("paid-non-us-refund");
const nonUsPayment: OpsDragPaymentAdmission = {
  ...paymentFor(nonUsAdmitted, "evt_paid_non_us_1"),
  refundReason: "CUSTOMER_COUNTRY_NOT_US_AFTER_PAYMENT",
};
const nonUsStore = new AtomicOrderStore(nonUsAdmitted);
await Promise.all(
  Array.from({ length: 32 }, (_, index) =>
    nonUsStore.transition((current) =>
      admitPaidNonUsAutomaticRefund(
        current,
        { ...nonUsPayment, webhookEventId: `evt_paid_non_us_${index + 1}` },
        `2026-08-22T20:02:${String(index).padStart(2, "0")}.000Z`
      ).order
    )
  )
);
const nonUsRequired = await nonUsStore.load();
assert.equal(nonUsRequired.payment?.refundReason, "CUSTOMER_COUNTRY_NOT_US_AFTER_PAYMENT");
assert.equal(nonUsRequired.fulfillment.lease_owner, null);
assert.equal(nonUsRequired.automation?.refund.status, "REQUIRED");
assert.equal(nonUsRequired.automation?.generation.attempts, 0);
assert.equal(nonUsRequired.automation?.delivery.attempts, 0);
assert.equal(nonUsRequired.receipts.filter((receipt) => receipt.kind === "PAYMENT_ADMITTED_REFUND_REQUIRED").length, 1);
assert.equal(nonUsRequired.receipts.filter((receipt) => receipt.kind === "REFUND_REQUIRED").length, 1);
assert.equal(countsAsVerifiedFirstSale(nonUsRequired), false);
assert.throws(
  () => startGenerationAttempt(nonUsRequired, "2026-08-22T20:03:00.000Z"),
  /Refund-path orders cannot start generation/
);
assert.equal(JSON.stringify(nonUsRequired).includes("123 Maple"), false);

await Promise.all(
  Array.from({ length: 32 }, () =>
    nonUsStore.transition((current) => claimRefundAttempt(current, "2026-08-22T20:03:01.000Z").order)
  )
);
const nonUsOwned = await nonUsStore.load();
assert.equal(nonUsOwned.automation?.refund.status, "OWNED");
assert.equal(nonUsOwned.automation?.refund.attempts, 1);
assert.equal(nonUsOwned.receipts.filter((receipt) => receipt.kind === "REFUND_ATTEMPT_OWNED").length, 1);
assert.equal(
  nonUsOwned.automation?.refund.idempotency_key,
  `ops-drag:${nonUsPayment.checkoutSessionId}:refund:v1`
);

let acceptedRefunds = 0;
const acceptedRefundKeys = new Set<string>();
const automaticRefundAdapter: RefundProviderAdapter = {
  async requestFullRefund(input) {
    assert.equal(input.remainingRefundableAmount, 2_900);
    assert.equal(input.currency, "usd");
    assert.equal(input.idempotencyKey, `ops-drag:${nonUsPayment.checkoutSessionId}:refund:v1`);
    if (!acceptedRefundKeys.has(input.idempotencyKey)) {
      acceptedRefundKeys.add(input.idempotencyKey);
      acceptedRefunds += 1;
    }
    return { providerRefundId: "re_paid_non_us_fixture" };
  },
};
const refundRecovery = await processPaidFulfillmentWorkerOrder({
  store: nonUsStore,
  generationAdapter,
  createEmailAdapter: () => {
    throw new Error("Paid non-US refund path must never create an email adapter");
  },
  createRefundAdapter: () => automaticRefundAdapter,
  recordedAt: "2026-08-22T20:03:02.000Z",
});
assert.equal(refundRecovery, "processed");
assert.equal(acceptedRefunds, 1);
const refundCreated = await nonUsStore.load();
assert.equal(refundCreated.automation?.refund.status, "CREATED");
assert.equal(refundCreated.automation?.terminal_disposition, null);
await Promise.all(
  Array.from({ length: 16 }, () =>
    processPaidFulfillmentWorkerOrder({
      store: nonUsStore,
      generationAdapter,
      createEmailAdapter: () => {
        throw new Error("Paid non-US refund path must never create an email adapter");
      },
      createRefundAdapter: () => automaticRefundAdapter,
      recordedAt: "2026-08-22T20:03:03.000Z",
    })
  )
);
assert.equal(acceptedRefunds, 1);
await nonUsStore.transition((current) =>
  applyRefundProviderEvent(
    current,
    {
      eventId: "evt_paid_non_us_refund_succeeded",
      providerRefundId: "re_paid_non_us_fixture",
      type: "refund.succeeded",
    },
    "2026-08-22T20:04:00.000Z"
  )
);
const nonUsRefunded = await nonUsStore.load();
assert.equal(nonUsRefunded.automation?.terminal_disposition, "REFUNDED");
assert.equal(nonUsRefunded.automation?.refund.status, "SUCCEEDED");
assert.equal(countsAsVerifiedFirstSale(nonUsRefunded), false);
assert.equal(nonUsRefunded.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);
assert.ok(verifyReceiptChain(nonUsRefunded));

console.log(
  "OPS_DRAG_REPORT_WEBHOOK_ORCHESTRATION_PASS lazy_preflight=PASS bounded_receipts=PASS refund_required=PASS duplicate_send=PASS redaction=PASS paid_non_us_refund=PASS"
);
