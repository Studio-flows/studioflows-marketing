import assert from "node:assert/strict";

import {
  applyEmailProviderEvent,
  admitGeneratedReport,
  claimDeliverySubmissionAttempt,
  expireDeliverySla,
  readPersistedReportArtifact,
  startGenerationAttempt,
  type EmailProviderAdapter,
  type ReportGenerationAdapter,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import {
  buildDeterministicOpsDragReport,
  createDeterministicReportGenerationAdapter,
  renderDeterministicOpsDragPdf,
} from "../lib/ops-drag-report/deterministic-report.ts";
import {
  orchestratePaidOpsDragFulfillment,
  type PaidFulfillmentOrderStore,
} from "../lib/ops-drag-report/paid-fulfillment-orchestrator.ts";
import { createDeliveryIdempotencyKey } from "../lib/ops-drag-report/provider-adapters.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  verifyReceiptChain,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";

const PAID_AT = "2026-08-22T20:00:00.000Z";
const RUN_AT = "2026-08-22T20:01:00.000Z";

function createPaidOrder(overrides: Record<string, unknown> = {}): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({
    id: "paid-fulfillment-submission",
    work_email: "owner@example.com",
    raw_answers: {
      primaryPainArea: "delivery coordination",
      highestCostBottleneck: "handoffs between intake and delivery",
      frequentBreakdown: "context is re-entered in multiple systems",
      workflowManagement: "a mix of inboxes and task lists",
      quarterRisk: "late delivery visibility",
      ...overrides,
    },
    metadata: {},
  }, "paid-fulfillment-submission", "2026-08-22T19:50:00.000Z");
  return claimFulfillmentOwnership(createAdmittedOrder(snapshot), {
    checkoutSessionId: "cs_test_paid_fulfillment",
    paymentReferenceId: "pi_test_paid_fulfillment",
    webhookEventId: "evt_test_paid_fulfillment",
    paidAt: PAID_AT,
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "a".repeat(64),
    snapshotDigest: snapshot.digest,
  }, "2026-08-22T20:00:01.000Z").order;
}

class AtomicOrderStore implements PaidFulfillmentOrderStore {
  private order: OpsDragOrder;
  private serial: Promise<void> = Promise.resolve();
  failNextSubmittedCommit = false;

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
        if (this.failNextSubmittedCommit && next.automation?.delivery.status === "SUBMITTED") {
          this.failNextSubmittedCommit = false;
          throw new Error("fixture crash before delivery state commit");
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

class IdempotentEmailFixture implements EmailProviderAdapter {
  calls = 0;
  acceptedSends = 0;
  failuresRemaining = 0;
  private readonly messages = new Map<string, string>();

  async submit(input: Parameters<EmailProviderAdapter["submit"]>[0]): Promise<{ providerMessageId: string }> {
    this.calls += 1;
    const key = createDeliveryIdempotencyKey(input.orderId, input.attemptNumber);
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error("fixture provider rejection");
    }
    const prior = this.messages.get(key);
    if (prior) return { providerMessageId: prior };
    assert.equal(input.filename, "studioflows-ops-drag-report.pdf");
    assert.ok(input.pdfBytes.byteLength > 0);
    const messageId = `msg_${input.attemptNumber}_${input.pdfSha256.slice(0, 12)}`;
    this.messages.set(key, messageId);
    this.acceptedSends += 1;
    return { providerMessageId: messageId };
  }
}

const deterministic = createDeterministicReportGenerationAdapter();
const deterministicOrder = createPaidOrder();
const generationInput = {
  orderId: deterministicOrder.order_id,
  submissionId: deterministicOrder.submission_id,
  snapshotDigest: deterministicOrder.snapshot.digest,
  snapshot: deterministicOrder.snapshot,
  generatedAt: PAID_AT,
  templateVersion: "ops_drag_report_template_v1" as const,
};
const generatedOne = await deterministic.generate(generationInput);
const generatedTwo = await deterministic.generate(generationInput);
assert.deepEqual(generatedOne.report, generatedTwo.report);
assert.deepEqual(generatedOne.pdfBytes, generatedTwo.pdfBytes);
assert.ok(Buffer.from(generatedOne.pdfBytes).toString("ascii", 0, 8).startsWith("%PDF-1.4"));
const reportText = JSON.stringify(generatedOne.report);
assert.doesNotMatch(reportText, /https?:|book (?:a )?call|subscription|guarantee(?:d|s)?/i);
assert.match(reportText, /Likely friction hypothesis/i);
assert.match(reportText, /Seven-day sequence|Day 7/i);
assert.match(reportText, /does not establish root cause/i);

const successStore = new AtomicOrderStore(createPaidOrder());
const successEmail = new IdempotentEmailFixture();
const success = await orchestratePaidOpsDragFulfillment({
  store: successStore,
  generationAdapter: deterministic,
  emailAdapter: successEmail,
  recordedAt: RUN_AT,
});
assert.equal(success.disposition, "DELIVERY_SUBMITTED");
assert.equal(success.order.automation?.generation.status, "VALIDATED");
assert.equal(success.order.automation?.delivery.status, "SUBMITTED");
assert.equal(success.order.automation?.terminal_disposition, null);
assert.equal(successEmail.acceptedSends, 1);
const persisted = readPersistedReportArtifact(success.order);
assert.equal(Buffer.from(persisted.pdfBytes).toString("base64"), Buffer.from(generatedOne.pdfBytes).toString("base64"));
assert.ok(verifyReceiptChain(success.order));

const delivered = applyEmailProviderEvent(success.order, {
  eventId: "evt_email_delivered",
  providerMessageId: success.order.automation!.delivery.provider_message_id!,
  type: "delivered",
}, "2026-08-22T20:02:00.000Z");
assert.equal(delivered.automation?.terminal_disposition, "DELIVERED");

const concurrentStore = new AtomicOrderStore(createPaidOrder());
const concurrentEmail = new IdempotentEmailFixture();
const [webhookRun, workerRun] = await Promise.all([
  orchestratePaidOpsDragFulfillment({ store: concurrentStore, generationAdapter: deterministic, emailAdapter: concurrentEmail, recordedAt: RUN_AT }),
  orchestratePaidOpsDragFulfillment({ store: concurrentStore, generationAdapter: deterministic, emailAdapter: concurrentEmail, recordedAt: RUN_AT }),
]);
const concurrentOrder = await concurrentStore.load();
assert.equal(concurrentEmail.acceptedSends, 1, "webhook and worker must share one provider idempotency owner");
assert.equal(concurrentOrder.automation?.delivery.attempts, 1);
assert.equal(concurrentOrder.receipts.filter((receipt) => receipt.kind === "REPORT_VALIDATED").length, 1);
assert.equal(concurrentOrder.receipts.filter((receipt) => receipt.kind === "DELIVERY_ATTEMPT_RECORDED").length, 2);
assert.ok([webhookRun.disposition, workerRun.disposition].every((value) => value === "DELIVERY_SUBMITTED"));

let validatedCrashOrder = startGenerationAttempt(createPaidOrder(), RUN_AT);
validatedCrashOrder = admitGeneratedReport(
  validatedCrashOrder,
  generatedOne.report,
  generatedOne.pdfBytes,
  "2026-08-22T20:01:01.000Z"
);
let resumeGenerationCalls = 0;
const resumeStore = new AtomicOrderStore(validatedCrashOrder);
const resumeEmail = new IdempotentEmailFixture();
const resume = await orchestratePaidOpsDragFulfillment({
  store: resumeStore,
  generationAdapter: { async generate() { resumeGenerationCalls += 1; throw new Error("must not regenerate"); } },
  emailAdapter: resumeEmail,
  recordedAt: "2026-08-22T20:01:02.000Z",
});
assert.equal(resume.disposition, "DELIVERY_SUBMITTED");
assert.equal(resumeGenerationCalls, 0, "validated artifacts must resume without regeneration");

const crashAfterProviderStore = new AtomicOrderStore(validatedCrashOrder);
crashAfterProviderStore.failNextSubmittedCommit = true;
const crashAfterProviderEmail = new IdempotentEmailFixture();
await assert.rejects(() => orchestratePaidOpsDragFulfillment({
  store: crashAfterProviderStore,
  generationAdapter: deterministic,
  emailAdapter: crashAfterProviderEmail,
  recordedAt: "2026-08-22T20:01:03.000Z",
}), /fixture crash/);
assert.equal((await crashAfterProviderStore.load()).automation?.delivery.status, "SUBMITTING");
const crashResume = await orchestratePaidOpsDragFulfillment({
  store: crashAfterProviderStore,
  generationAdapter: deterministic,
  emailAdapter: crashAfterProviderEmail,
  recordedAt: "2026-08-22T20:01:04.000Z",
});
assert.equal(crashResume.disposition, "DELIVERY_SUBMITTED");
assert.equal(crashAfterProviderEmail.calls, 2);
assert.equal(crashAfterProviderEmail.acceptedSends, 1, "crash retry must reuse the provider idempotency key");

const malformedOrder = createPaidOrder({
  primaryPainArea: ["rk", "live", "123456789012345678901234"].join("_"),
});
const malformedStore = new AtomicOrderStore(malformedOrder);
let malformedEmailCalls = 0;
const malformed = await orchestratePaidOpsDragFulfillment({
  store: malformedStore,
  generationAdapter: deterministic,
  emailAdapter: { async submit() { malformedEmailCalls += 1; return { providerMessageId: "msg_forbidden" }; } },
  recordedAt: RUN_AT,
});
assert.equal(malformed.disposition, "GENERATION_RETRYABLE");
assert.equal(malformedEmailCalls, 0);
assert.equal(malformed.order.automation?.generation.attempts, 1);

const tamperedSnapshot = structuredClone(deterministicOrder.snapshot);
tamperedSnapshot.report_input.quizPayload.primaryPainArea = "tampered after admission";
assert.throws(() => buildDeterministicOpsDragReport({
  ...generationInput,
  snapshot: tamperedSnapshot,
}), /digest is invalid/);
assert.ok(renderDeterministicOpsDragPdf(generatedOne.report as ReturnType<typeof buildDeterministicOpsDragReport>).byteLength > 0);

const failureStore = new AtomicOrderStore(createPaidOrder());
const failureEmail = new IdempotentEmailFixture();
failureEmail.failuresRemaining = 3;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const failed = await orchestratePaidOpsDragFulfillment({
    store: failureStore,
    generationAdapter: deterministic,
    emailAdapter: failureEmail,
    recordedAt: `2026-08-22T20:0${attempt}:00.000Z`,
  });
  assert.equal(failed.disposition, attempt === 3 ? "DELIVERY_FAILED" : "DELIVERY_RETRYABLE");
}
const exhausted = await failureStore.load();
assert.equal(exhausted.automation?.delivery.attempts, 3);
assert.equal(exhausted.automation?.delivery.status, "FAILED");
assert.equal(exhausted.automation?.refund.status, "REQUIRED");
const acceptedBeforeRefundHold = failureEmail.acceptedSends;
const refundHeld = await orchestratePaidOpsDragFulfillment({
  store: failureStore,
  generationAdapter: deterministic,
  emailAdapter: failureEmail,
  recordedAt: "2026-08-22T20:05:00.000Z",
});
assert.equal(refundHeld.disposition, "REFUND_PATH_HELD");
assert.equal(failureEmail.acceptedSends, acceptedBeforeRefundHold, "refund ownership must prevent delivery");
assert.ok(verifyReceiptChain(refundHeld.order));

const refundWinnerStore = new AtomicOrderStore(validatedCrashOrder);
await refundWinnerStore.transition((order) => expireDeliverySla(order, "2026-08-22T21:00:00.000Z"));
const refundWinnerEmail = new IdempotentEmailFixture();
const refundWinner = await orchestratePaidOpsDragFulfillment({
  store: refundWinnerStore,
  generationAdapter: deterministic,
  emailAdapter: refundWinnerEmail,
  recordedAt: "2026-08-22T21:00:01.000Z",
});
assert.equal(refundWinner.disposition, "REFUND_PATH_HELD");
assert.equal(refundWinnerEmail.calls, 0, "a refund winner must prevent provider submission");

const deliveryWinnerStore = new AtomicOrderStore(validatedCrashOrder);
await deliveryWinnerStore.transition((order) => claimDeliverySubmissionAttempt(order, RUN_AT).order);
await deliveryWinnerStore.transition((order) => expireDeliverySla(order, "2026-08-22T21:00:00.000Z"));
const deliveryWinnerEmail = new IdempotentEmailFixture();
const deliveryWinner = await orchestratePaidOpsDragFulfillment({
  store: deliveryWinnerStore,
  generationAdapter: deterministic,
  emailAdapter: deliveryWinnerEmail,
  recordedAt: "2026-08-22T21:00:01.000Z",
});
assert.equal(deliveryWinner.disposition, "DELIVERY_SUBMITTED");
assert.equal(deliveryWinner.order.automation?.refund.status, "NOT_REQUIRED");
assert.equal(deliveryWinnerEmail.acceptedSends, 1, "a delivery lease winner must remain resumable");

console.log(
  "OPS_DRAG_REPORT_PAID_FULFILLMENT_PASS deterministic_pdf=PASS webhook_worker_dedup=PASS crash_resume=PASS claim_scan=PASS provider_retry=PASS refund_wins=PASS"
);
