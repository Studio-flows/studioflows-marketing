import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  expireDeliverySla,
  RefundSubmissionOutcomeUnknownError,
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
import { selectBoundedWorkerPage } from "../lib/ops-drag-report/worker-selection.ts";

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
  failNextRefundCreatedCommit = false;

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async load(): Promise<OpsDragOrder> {
    await this.serial;
    return structuredClone(this.order);
  }

  async transition(apply: (order: OpsDragOrder) => OpsDragOrder): Promise<OpsDragOrder> {
    let result: OpsDragOrder | null = null;
    let failure: Error | null = null;
    this.serial = this.serial.then(() => {
      try {
        const next = apply(structuredClone(this.order));
        if (this.failNextRefundCreatedCommit && next.automation?.refund.status === "CREATED") {
          this.failNextRefundCreatedCommit = false;
          throw new Error("fixture crash before refund response persistence");
        }
        this.order = structuredClone(next);
        result = structuredClone(this.order);
      } catch (error) {
        failure = error instanceof Error ? error : new Error("fixture transition failed");
      }
    });
    await this.serial;
    if (failure) throw failure;
    return result!;
  }
}

class IdempotentRefundFixture implements RefundProviderAdapter {
  calls = 0;
  acceptedRefunds = 0;
  unknownResponsesRemaining: number;
  readonly idempotencyKeys: string[] = [];
  private readonly refunds = new Map<string, string>();

  constructor(unknownResponses = 0) {
    this.unknownResponsesRemaining = unknownResponses;
  }

  async requestFullRefund(
    input: Parameters<RefundProviderAdapter["requestFullRefund"]>[0]
  ): Promise<{ providerRefundId: string }> {
    this.calls += 1;
    this.idempotencyKeys.push(input.idempotencyKey);
    let refundId = this.refunds.get(input.idempotencyKey);
    if (!refundId) {
      refundId = `re_${input.checkoutSessionId}`;
      this.refunds.set(input.idempotencyKey, refundId);
      this.acceptedRefunds += 1;
    }
    if (this.unknownResponsesRemaining > 0) {
      this.unknownResponsesRemaining -= 1;
      throw new RefundSubmissionOutcomeUnknownError();
    }
    return { providerRefundId: refundId };
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

const refundCrashStore = new AtomicOrderStore(expireDeliverySla(createPaidOrder("refund-response-crash"), REFUND_AT));
refundCrashStore.failNextRefundCreatedCommit = true;
const crashRefundProvider = new IdempotentRefundFixture();
await assert.rejects(() => processPaidFulfillmentWorkerOrder({
  store: refundCrashStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter: () => crashRefundProvider,
  recordedAt: REFUND_AT,
}), /fixture crash before refund response persistence/);
const ownedAfterCrash = await refundCrashStore.load();
assert.equal(ownedAfterCrash.automation?.refund.status, "OWNED");
assert.equal(ownedAfterCrash.automation?.refund.attempts, 1);
const crashKey = ownedAfterCrash.automation?.refund.idempotency_key;
assert.ok(crashKey);
const refundCrashRecovery = await processPaidFulfillmentWorkerOrder({
  store: refundCrashStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter: () => crashRefundProvider,
  recordedAt: "2026-08-22T21:00:01.000Z",
});
assert.equal(refundCrashRecovery, "processed");
assert.equal((await refundCrashStore.load()).automation?.refund.status, "CREATED");
assert.equal(crashRefundProvider.acceptedRefunds, 1);
assert.equal(new Set(crashRefundProvider.idempotencyKeys).size, 1);
assert.equal(crashRefundProvider.idempotencyKeys[0], crashKey);
const refundCrashDuplicateWake = await processPaidFulfillmentWorkerOrder({
  store: refundCrashStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter: () => crashRefundProvider,
  recordedAt: "2026-08-22T21:00:02.000Z",
});
assert.equal(refundCrashDuplicateWake, "noop");
assert.equal(crashRefundProvider.acceptedRefunds, 1);

const refundUnknownStore = new AtomicOrderStore(expireDeliverySla(createPaidOrder("refund-response-unknown"), REFUND_AT));
const unknownRefundProvider = new IdempotentRefundFixture(1);
const unknownRefundFirst = await processPaidFulfillmentWorkerOrder({
  store: refundUnknownStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter: () => unknownRefundProvider,
  recordedAt: REFUND_AT,
});
assert.equal(unknownRefundFirst, "blocked");
const refundUnknownOwned = await refundUnknownStore.load();
assert.equal(refundUnknownOwned.automation?.refund.status, "OWNED");
assert.equal(refundUnknownOwned.automation?.refund.attempts, 1);
assert.equal(refundUnknownOwned.automation?.refund.request_outcome_unknown_count, 1);
const unknownRefundSecond = await processPaidFulfillmentWorkerOrder({
  store: refundUnknownStore,
  generationAdapter,
  createEmailAdapter: () => successfulEmail,
  createRefundAdapter: () => unknownRefundProvider,
  recordedAt: "2026-08-22T21:00:01.000Z",
});
assert.equal(unknownRefundSecond, "processed");
const refundUnknownCreated = await refundUnknownStore.load();
assert.equal(refundUnknownCreated.automation?.refund.status, "CREATED");
assert.equal(refundUnknownCreated.automation?.refund.attempts, 1);
assert.equal(unknownRefundProvider.acceptedRefunds, 1);
assert.equal(new Set(unknownRefundProvider.idempotencyKeys).size, 1);
const refundReceiptJson = JSON.stringify(refundUnknownCreated.receipts);
assert.doesNotMatch(refundReceiptJson, /refund-response-unknown@example\.com|missing context/);
assert.ok(verifyReceiptChain(refundUnknownCreated));

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

const terminalRows = Array.from({ length: 10 }, (_, index) => {
  const order = expireDeliverySla(createPaidOrder(`terminal-${index + 1}`), REFUND_AT);
  order.automation!.terminal_disposition = "REFUNDED";
  order.workflow_status = "DONE";
  return { cursorId: `${index + 1}`.padStart(3, "0"), order };
});
const eligibleEleventh = createPaidOrder("eligible-eleventh");
assert.equal(eligibleEleventh.automation, null, "fixture must preserve explicit JSON-null automation");
const rotationRows = [...terminalRows, { cursorId: "011", order: eligibleEleventh }];
const firstWake = selectBoundedWorkerPage({
  rows: rotationRows,
  afterCursor: null,
  recordedAt: DELIVERY_AT,
  limit: 10,
});
assert.equal(firstWake.scanned, 10);
assert.deepEqual(firstWake.orders, []);
assert.equal(firstWake.nextCursor, "010");
const secondWake = selectBoundedWorkerPage({
  rows: rotationRows,
  afterCursor: firstWake.nextCursor,
  recordedAt: DELIVERY_AT,
  limit: 10,
});
assert.deepEqual(secondWake.orders.map((order) => order.submission_id), ["eligible-eleventh"]);
assert.equal(secondWake.nextCursor, "011");

const submittedNotDue = await deliveryStore.load();
const dueRows = [
  { cursorId: "001", order: submittedNotDue },
  { cursorId: "002", order: createPaidOrder("generation-behind-not-due") },
];
const notDueWake = selectBoundedWorkerPage({
  rows: dueRows,
  afterCursor: null,
  recordedAt: DELIVERY_AT,
  limit: 1,
});
assert.deepEqual(notDueWake.orders, []);
const generationWake = selectBoundedWorkerPage({
  rows: dueRows,
  afterCursor: notDueWake.nextCursor,
  recordedAt: DELIVERY_AT,
  limit: 1,
});
assert.deepEqual(generationWake.orders.map((order) => order.submission_id), ["generation-behind-not-due"]);
const submittedDueWake = selectBoundedWorkerPage({
  rows: dueRows,
  afterCursor: null,
  recordedAt: REFUND_AT,
  limit: 1,
});
assert.deepEqual(submittedDueWake.orders.map((order) => order.submission_id), ["delivery-path"]);
const workerMigration = readFileSync(
  new URL("../supabase/migrations/20260822_add_ops_drag_worker_cursor.sql", import.meta.url),
  "utf8"
);
assert.match(workerMigration, /for update/i);
assert.match(workerMigration, /order by lead\.id asc[\s\S]*limit p_limit/i);
assert.match(workerMigration, /after_id = v_last_id/i);
assert.match(
  workerMigration,
  /jsonb_typeof\(page\.metadata #> '\{ops_drag_report_order,automation\}'\) = 'null'/i
);
assert.match(workerMigration, /refund,status\}' in \('REQUIRED', 'RETRYABLE', 'OWNED'\)/i);
assert.match(workerMigration, /grant execute[\s\S]*to service_role/i);
assert.doesNotMatch(workerMigration, /grant execute[\s\S]*to (?:anon|authenticated)/i);
assert.equal((workerMigration.match(/\$\$/g) ?? []).length, 2, "migration function body must have one balanced dollar quote");

console.log(
  "OPS_DRAG_REPORT_WORKER_ISOLATION_PASS delivery_without_refund_config=PASS refund_without_email_config=PASS bounded_config_receipts=PASS refund_owned_crash_recovery=PASS refund_unknown_same_key=PASS batch_continues=PASS json_null_cursor_recovery=PASS due_selection=PASS migration_contract=PASS"
);
