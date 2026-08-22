import assert from "node:assert/strict";

import {
  expireDeliverySla,
  type EmailProviderAdapter,
  type RefundProviderAdapter,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import { createDeterministicReportGenerationAdapter } from "../lib/ops-drag-report/deterministic-report.ts";
import {
  processPaidFulfillmentWorkerOrder,
  type PaidFulfillmentWorkerDisposition,
} from "../lib/ops-drag-report/paid-fulfillment-worker.ts";
import type { PaidFulfillmentOrderStore } from "../lib/ops-drag-report/paid-fulfillment-orchestrator.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  verifyReceiptChain,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";
import { runBoundedProviderWorker } from "../lib/ops-drag-report/provider-worker.ts";

const PAID_AT = "2026-08-22T20:00:00.000Z";
const DELIVERY_AT = "2026-08-22T20:01:00.000Z";
const REFUND_AT = "2026-08-22T21:00:00.000Z";

function createPaidOrder(id: string): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({
    id,
    work_email: `${id}@example.com`,
    raw_answers: {
      primaryPainArea: "delivery coordination",
      highestCostBottleneck: "handoffs",
      frequentBreakdown: "missing context",
      workflowManagement: "task lists",
      quarterRisk: "delivery visibility",
    },
    metadata: {},
  }, id, "2026-08-22T19:50:00.000Z");
  return claimFulfillmentOwnership(createAdmittedOrder(snapshot), {
    checkoutSessionId: `cs_test_${id}`,
    paymentReferenceId: `pi_test_${id}`,
    webhookEventId: `evt_test_${id}`,
    paidAt: PAID_AT,
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "b".repeat(64),
    snapshotDigest: snapshot.digest,
  }, "2026-08-22T20:00:01.000Z").order;
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
const successfulEmail: EmailProviderAdapter = {
  async submit(input) {
    return { providerMessageId: `msg_${input.orderId}_${input.attemptNumber}` };
  },
};
const successfulRefund: RefundProviderAdapter = {
  async requestFullRefund(input) {
    return { providerRefundId: `re_${input.checkoutSessionId}` };
  },
};

const refundStore = new AtomicOrderStore(expireDeliverySla(createPaidOrder("refund-path"), REFUND_AT));
let refundEmailFactoryCalls = 0;
const refundResult = await processPaidFulfillmentWorkerOrder({
  store: refundStore,
  generationAdapter,
  createEmailAdapter() {
    refundEmailFactoryCalls += 1;
    throw new Error("Resend configuration is intentionally unavailable");
  },
  createRefundAdapter: () => successfulRefund,
  recordedAt: REFUND_AT,
});
assert.equal(refundResult, "processed");
assert.equal(refundEmailFactoryCalls, 0, "email configuration must not gate an eligible refund");
assert.equal((await refundStore.load()).automation?.refund.status, "CREATED");

const deliveryStore = new AtomicOrderStore(createPaidOrder("delivery-path"));
let deliveryRefundFactoryCalls = 0;
const deliveryResult = await processPaidFulfillmentWorkerOrder({
  store: deliveryStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter() {
    deliveryRefundFactoryCalls += 1;
    throw new Error("Stripe refund configuration is intentionally unavailable");
  },
  recordedAt: DELIVERY_AT,
});
assert.equal(deliveryResult, "processed");
assert.equal(deliveryRefundFactoryCalls, 0, "refund configuration must not gate an eligible delivery");
assert.equal((await deliveryStore.load()).automation?.delivery.status, "SUBMITTED");

const deliveryConfigStore = new AtomicOrderStore(createPaidOrder("delivery-config-failure"));
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const result = await processPaidFulfillmentWorkerOrder({
    store: deliveryConfigStore,
    generationAdapter,
    createEmailAdapter() {
      throw new Error("Resend configuration is invalid");
    },
    createRefundAdapter: () => successfulRefund,
    recordedAt: `2026-08-22T20:0${attempt}:00.000Z`,
  });
  assert.equal(result, "blocked");
}
const deliveryConfigFailure = await deliveryConfigStore.load();
assert.equal(deliveryConfigFailure.automation?.delivery.status, "FAILED");
assert.equal(deliveryConfigFailure.automation?.delivery.attempts, 3);
assert.equal(deliveryConfigFailure.automation?.refund.status, "REQUIRED");
assert.equal(
  deliveryConfigFailure.automation?.attempts.filter((attempt) =>
    attempt.failure_code === "EMAIL_PROVIDER_CONFIGURATION_FAILED"
  ).length,
  3
);
assert.ok(verifyReceiptChain(deliveryConfigFailure));

const refundConfigStore = new AtomicOrderStore(expireDeliverySla(createPaidOrder("refund-config-failure"), REFUND_AT));
const refundConfigResult = await processPaidFulfillmentWorkerOrder({
  store: refundConfigStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter() {
    throw new Error("Stripe refund configuration is invalid");
  },
  recordedAt: REFUND_AT,
});
assert.equal(refundConfigResult, "blocked");
const refundConfigFailure = await refundConfigStore.load();
assert.equal(refundConfigFailure.automation?.refund.status, "RETRYABLE");
assert.equal(refundConfigFailure.automation?.refund.attempts, 1);
assert.equal(
  refundConfigFailure.automation?.attempts.at(-1)?.failure_code,
  "REFUND_PROVIDER_CONFIGURATION_FAILED"
);
assert.ok(verifyReceiptChain(refundConfigFailure));

type BatchFixture = {
  store: AtomicOrderStore;
  emailFactory(): EmailProviderAdapter;
  refundFactory(order: OpsDragOrder): RefundProviderAdapter;
  recordedAt: string;
};

const batchFixtures: BatchFixture[] = [
  {
    store: new AtomicOrderStore(createPaidOrder("batch-delivery")),
    emailFactory: () => successfulEmail,
    refundFactory: () => { throw new Error("unused refund configuration"); },
    recordedAt: DELIVERY_AT,
  },
  {
    store: new AtomicOrderStore(expireDeliverySla(createPaidOrder("batch-refund-failure"), REFUND_AT)),
    emailFactory: () => { throw new Error("unused email configuration"); },
    refundFactory: () => { throw new Error("refund configuration failure"); },
    recordedAt: REFUND_AT,
  },
  {
    store: new AtomicOrderStore(createPaidOrder("batch-delivery-failure")),
    emailFactory: () => { throw new Error("email configuration failure"); },
    refundFactory: () => successfulRefund,
    recordedAt: DELIVERY_AT,
  },
];
const batchResult = await runBoundedProviderWorker({
  loadBatch: async () => batchFixtures,
  process: (fixture): Promise<PaidFulfillmentWorkerDisposition> => processPaidFulfillmentWorkerOrder({
    store: fixture.store,
    generationAdapter,
    createEmailAdapter: fixture.emailFactory,
    createRefundAdapter: fixture.refundFactory,
    recordedAt: fixture.recordedAt,
  }),
});
assert.deepEqual(batchResult, { scanned: 3, processed: 1, noop: 0, blocked: 2 });

console.log(
  "OPS_DRAG_REPORT_WORKER_ISOLATION_PASS delivery_without_refund_config=PASS refund_without_email_config=PASS bounded_config_receipts=PASS batch_continues=PASS"
);
