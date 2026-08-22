import assert from "node:assert/strict";

import {
  admitGeneratedReport,
  applyEmailProviderEvent,
  applyRefundProviderEvent,
  claimRefundAttempt,
  consumeOrderToken,
  countsAsVerifiedFirstSale,
  createOrderToken,
  createRefundIdempotencyKey,
  expireDeliverySla,
  EMAIL_PROVIDER_EVENT_TRANSITION_MATRIX,
  OPS_DRAG_REPORT_SCHEMA_VERSION,
  OPS_DRAG_REPORT_TEMPLATE_VERSION,
  recordGenerationFailure,
  startDeliveryAttempt,
  startGenerationAttempt,
  validateGeneratedReport,
  type OpsDragReportDocument,
  type RefundOwnershipResult,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  type OpsDragOrder,
  type OpsDragPaymentAdmission,
  verifyReceiptChain,
} from "../lib/ops-drag-report/order-foundation.ts";

const submissionId = "f53f4be4-04f6-4bb0-a145-72f37bb2f1de";
const payment: OpsDragPaymentAdmission = {
  checkoutSessionId: "cs_test_delivery_refund",
  paymentReferenceId: "pi_test_delivery_refund",
  webhookEventId: "evt_test_payment",
  paidAt: "2026-08-22T20:10:00.000Z",
  amountTotal: 2_900,
  currency: "usd",
  customerEmailSha256: "a".repeat(64),
  snapshotDigest: "",
};

function makePaidOrder(): OpsDragOrder {
  const snapshot = createAdmittedSnapshot(
    {
      id: submissionId,
      work_email: "owner@example.com",
      company_name: "Example Operations",
      primary_pain_area: "Handoffs",
      raw_answers: {},
      metadata: {},
    },
    submissionId,
    "2026-08-22T20:00:00.000Z"
  );
  const admission = { ...payment, snapshotDigest: snapshot.digest };
  return claimFulfillmentOwnership(
    createAdmittedOrder(snapshot),
    admission,
    "2026-08-22T20:10:01.000Z"
  ).order;
}

function createReport(order: OpsDragOrder): OpsDragReportDocument {
  return {
    schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    order_id: order.order_id,
    submission_id: order.submission_id,
    generated_at: "2026-08-22T20:10:20.000Z",
    title: "Operations Drag Report",
    summary: "Observed inputs suggest a handoff bottleneck that should be tested with workflow evidence.",
    hypotheses: ["Ownership at the handoff may be unclear."],
    seven_day_sequence: [
      "Capture the current handoff boundary.",
      "Name one accountable owner.",
      "Record entry and exit evidence.",
      "Run one bounded handoff.",
      "Measure wait time and rework.",
      "Adjust the narrowest failing step.",
      "Compare the evidence with the baseline.",
    ],
    limitations: "This report uses submitted inputs and does not constitute an audit or professional advice.",
    evidence_to_collect: ["Handoff timestamp", "Named owner", "Rework count"],
  };
}

function makeGeneratedOrder(): OpsDragOrder {
  let order = makePaidOrder();
  order = startGenerationAttempt(order, "2026-08-22T20:10:10.000Z");
  order = admitGeneratedReport(
    order,
    createReport(order),
    new TextEncoder().encode("%PDF-1.7 fixture report"),
    "2026-08-22T20:10:30.000Z"
  );
  return order;
}

function makeSubmittedOrder(messageId = "msg_delivery_1"): OpsDragOrder {
  return startDeliveryAttempt(makeGeneratedOrder(), messageId, "2026-08-22T20:11:00.000Z");
}

let generationFailure = makePaidOrder();
for (let attempt = 1; attempt <= 3; attempt += 1) {
  generationFailure = startGenerationAttempt(generationFailure, `2026-08-22T20:1${attempt}:00.000Z`);
  generationFailure = recordGenerationFailure(
    generationFailure,
    `GENERATION_FIXTURE_${attempt}`,
    `2026-08-22T20:1${attempt}:01.000Z`
  );
}
assert.equal(generationFailure.automation?.generation.attempts, 3);
assert.equal(generationFailure.automation?.generation.status, "FAILED");
assert.equal(generationFailure.workflow_status, "BLOCKED");

let deliveryFailure = makeGeneratedOrder();
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const messageId = `msg_delivery_failure_${attempt}`;
  deliveryFailure = startDeliveryAttempt(deliveryFailure, messageId, `2026-08-22T20:2${attempt}:00.000Z`);
  deliveryFailure = applyEmailProviderEvent(
    deliveryFailure,
    { eventId: `email_failed_${attempt}`, providerMessageId: messageId, type: "failed" },
    `2026-08-22T20:2${attempt}:01.000Z`
  );
}
assert.equal(deliveryFailure.automation?.delivery.attempts, 3);
assert.equal(deliveryFailure.automation?.delivery.status, "FAILED");
assert.equal(deliveryFailure.automation?.refund.status, "REQUIRED");
assert.equal(EMAIL_PROVIDER_EVENT_TRANSITION_MATRIX.SUBMITTED.delivered, "APPLY");
assert.equal(EMAIL_PROVIDER_EVENT_TRANSITION_MATRIX.HARD_BOUNCE.delivered, "EVIDENCE_ONLY");

let delivered = makeSubmittedOrder();
delivered = applyEmailProviderEvent(
  delivered,
  { eventId: "email_accepted", providerMessageId: "msg_delivery_1", type: "accepted" },
  "2026-08-22T20:11:01.000Z"
);
assert.equal(delivered.automation?.delivery.status, "ACCEPTED");
assert.equal(countsAsVerifiedFirstSale(delivered), false, "accepted must not count as delivered");
delivered = applyEmailProviderEvent(
  delivered,
  { eventId: "email_sent", providerMessageId: "msg_delivery_1", type: "sent" },
  "2026-08-22T20:11:02.000Z"
);
assert.equal(delivered.automation?.delivery.status, "SENT");
assert.equal(countsAsVerifiedFirstSale(delivered), false, "sent must not count as delivered");
delivered = applyEmailProviderEvent(
  delivered,
  { eventId: "email_delivered", providerMessageId: "msg_delivery_1", type: "delivered" },
  "2026-08-22T20:12:00.000Z"
);
assert.equal(delivered.automation?.terminal_disposition, "DELIVERED");
assert.equal(delivered.workflow_status, "DONE");
assert.equal(countsAsVerifiedFirstSale(delivered), true);
assert.equal(delivered.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);
assert.ok(verifyReceiptChain(delivered));

let bounced = makeSubmittedOrder("msg_bounce");
bounced = applyEmailProviderEvent(
  bounced,
  { eventId: "email_bounce", providerMessageId: "msg_bounce", type: "hard_bounce" },
  "2026-08-22T20:12:00.000Z"
);
assert.equal(bounced.automation?.refund.status, "REQUIRED");
assert.equal(countsAsVerifiedFirstSale(bounced), false);
const refundOwnership = claimRefundAttempt(bounced, "2026-08-22T20:12:01.000Z");
assert.equal(refundOwnership.disposition, "acquired");
assert.equal(refundOwnership.idempotencyKey, "ops-drag:cs_test_delivery_refund:refund:v1");
assert.equal(createRefundIdempotencyKey(bounced), refundOwnership.idempotencyKey);
let refunded = applyRefundProviderEvent(
  refundOwnership.order,
  { eventId: "refund_created", providerRefundId: "re_fixture", type: "refund.created" },
  "2026-08-22T20:12:02.000Z"
);
assert.equal(refunded.automation?.refund.status, "CREATED");
assert.equal(refunded.automation?.terminal_disposition, null, "refund.created must remain nonterminal");
refunded = applyRefundProviderEvent(
  refunded,
  { eventId: "refund_succeeded", providerRefundId: "re_fixture", type: "refund.succeeded" },
  "2026-08-22T20:12:03.000Z"
);
assert.equal(refunded.automation?.terminal_disposition, "REFUNDED");
assert.equal(countsAsVerifiedFirstSale(refunded), false);
assert.equal(refunded.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);
assert.ok(verifyReceiptChain(refunded));

class AtomicRefundHarness {
  private order: OpsDragOrder;
  private revision = 0;
  acquiredWrites = 0;

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async claim(recordedAt: string): Promise<RefundOwnershipResult> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const revision = this.revision;
      const observed = structuredClone(this.order);
      const transition = claimRefundAttempt(observed, recordedAt);
      await Promise.resolve();
      if (transition.order === observed) return transition;
      if (revision !== this.revision) continue;
      this.order = structuredClone(transition.order);
      this.revision += 1;
      if (transition.disposition === "acquired") this.acquiredWrites += 1;
      return structuredClone(transition);
    }
    throw new Error("Refund concurrency fixture exhausted its compare-and-swap budget");
  }

  read(): OpsDragOrder {
    return structuredClone(this.order);
  }
}

const expired = expireDeliverySla(makeSubmittedOrder("msg_sla"), "2026-08-22T21:00:00.000Z");
assert.equal(expired.automation?.refund.status, "REQUIRED");
const refundHarness = new AtomicRefundHarness(expired);
const concurrentRefunds = await Promise.all(
  Array.from({ length: 32 }, () => refundHarness.claim("2026-08-22T21:00:01.000Z"))
);
assert.equal(concurrentRefunds.filter((result) => result.disposition === "acquired").length, 1);
assert.equal(concurrentRefunds.filter((result) => result.disposition === "duplicate").length, 31);
assert.equal(refundHarness.acquiredWrites, 1, "SLA expiry must create exactly one refund owner");
assert.equal(refundHarness.read().automation?.refund.attempts, 1);

class AtomicProviderEventHarness {
  private order: OpsDragOrder;
  private revision = 0;
  writes = 0;

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async deliver(): Promise<OpsDragOrder> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const revision = this.revision;
      const observed = structuredClone(this.order);
      const next = applyEmailProviderEvent(
        observed,
        { eventId: "email_concurrent", providerMessageId: "msg_concurrent", type: "delivered" },
        "2026-08-22T20:12:00.000Z"
      );
      await Promise.resolve();
      if (next === observed) return next;
      if (revision !== this.revision) continue;
      this.order = structuredClone(next);
      this.revision += 1;
      this.writes += 1;
      return structuredClone(next);
    }
    throw new Error("Provider-event fixture exhausted its compare-and-swap budget");
  }

  read(): OpsDragOrder {
    return structuredClone(this.order);
  }
}

const providerHarness = new AtomicProviderEventHarness(makeSubmittedOrder("msg_concurrent"));
await Promise.all(Array.from({ length: 32 }, () => providerHarness.deliver()));
assert.equal(providerHarness.writes, 1, "duplicate provider events must create one state write");
assert.equal(providerHarness.read().receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);

class AtomicTransitionHarness {
  private order: OpsDragOrder;
  private revision = 0;

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async apply(transition: (order: OpsDragOrder) => OpsDragOrder): Promise<OpsDragOrder> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const revision = this.revision;
      const observed = structuredClone(this.order);
      const next = transition(observed);
      await Promise.resolve();
      if (next === observed) return next;
      if (revision !== this.revision) continue;
      this.order = structuredClone(next);
      this.revision += 1;
      return structuredClone(next);
    }
    throw new Error("Cross-race fixture exhausted its compare-and-swap budget");
  }

  read(): OpsDragOrder {
    return structuredClone(this.order);
  }
}

let vessaCrossRace = makeSubmittedOrder("msg_vessa_cross_race");
vessaCrossRace = applyEmailProviderEvent(
  vessaCrossRace,
  { eventId: "vessa_bounce", providerMessageId: "msg_vessa_cross_race", type: "hard_bounce" },
  "2026-08-22T20:12:00.000Z"
);
const vessaRefundOwner = claimRefundAttempt(vessaCrossRace, "2026-08-22T20:12:01.000Z");
assert.equal(vessaRefundOwner.disposition, "acquired");
vessaCrossRace = applyRefundProviderEvent(
  vessaRefundOwner.order,
  { eventId: "vessa_refund_created", providerRefundId: "re_vessa_cross_race", type: "refund.created" },
  "2026-08-22T20:12:02.000Z"
);
const crossRaceHarness = new AtomicTransitionHarness(vessaCrossRace);
await Promise.all([
  crossRaceHarness.apply((order) => applyEmailProviderEvent(
    order,
    { eventId: "vessa_late_delivered", providerMessageId: "msg_vessa_cross_race", type: "delivered" },
    "2026-08-22T20:12:03.000Z"
  )),
  crossRaceHarness.apply((order) => applyRefundProviderEvent(
    order,
    { eventId: "vessa_refund_succeeded", providerRefundId: "re_vessa_cross_race", type: "refund.succeeded" },
    "2026-08-22T20:12:03.000Z"
  )),
]);
const vessaCrossRaceResult = crossRaceHarness.read();
assert.equal(vessaCrossRaceResult.automation?.terminal_disposition, "REFUNDED");
assert.equal(vessaCrossRaceResult.automation?.delivery.status, "HARD_BOUNCE");
assert.equal(countsAsVerifiedFirstSale(vessaCrossRaceResult), false);
assert.equal(vessaCrossRaceResult.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);
assert.equal(vessaCrossRaceResult.receipts.filter((receipt) => receipt.kind === "REFUND_ATTEMPT_OWNED").length, 1);
const vessaLateDeliveryReceipt = vessaCrossRaceResult.receipts.find(
  (receipt) => receipt.evidence.provider_event_id === "vessa_late_delivered"
);
assert.equal(vessaLateDeliveryReceipt?.evidence.transition_disposition, "EVIDENCE_ONLY");
assert.equal(vessaLateDeliveryReceipt?.evidence.delivery_terminal_eligible, false);
assert.ok(verifyReceiptChain(vessaCrossRaceResult));

let veloContradictory = expireDeliverySla(
  makeSubmittedOrder("msg_velo_contradictory"),
  "2026-08-22T21:00:00.000Z"
);
veloContradictory = applyEmailProviderEvent(
  veloContradictory,
  { eventId: "velo_late_required", providerMessageId: "msg_velo_contradictory", type: "delivered" },
  "2026-08-22T21:00:01.000Z"
);
assert.equal(veloContradictory.automation?.refund.status, "REQUIRED");
assert.equal(veloContradictory.automation?.terminal_disposition, null);
assert.equal(countsAsVerifiedFirstSale(veloContradictory), false);
const veloRefundOwner = claimRefundAttempt(veloContradictory, "2026-08-22T21:00:02.000Z");
assert.equal(veloRefundOwner.disposition, "acquired");
veloContradictory = applyEmailProviderEvent(
  veloRefundOwner.order,
  { eventId: "velo_late_owned", providerMessageId: "msg_velo_contradictory", type: "delivered" },
  "2026-08-22T21:00:03.000Z"
);
assert.equal(veloContradictory.automation?.refund.status, "OWNED");
veloContradictory = applyRefundProviderEvent(
  veloContradictory,
  { eventId: "velo_refund_created", providerRefundId: "re_velo_contradictory", type: "refund.created" },
  "2026-08-22T21:00:04.000Z"
);
veloContradictory = applyEmailProviderEvent(
  veloContradictory,
  { eventId: "velo_late_created", providerMessageId: "msg_velo_contradictory", type: "delivered" },
  "2026-08-22T21:00:05.000Z"
);
const receiptsBeforeDuplicate = veloContradictory.receipts.length;
veloContradictory = applyEmailProviderEvent(
  veloContradictory,
  { eventId: "velo_late_created", providerMessageId: "msg_velo_contradictory", type: "delivered" },
  "2026-08-22T21:00:06.000Z"
);
assert.equal(veloContradictory.receipts.length, receiptsBeforeDuplicate, "duplicate event IDs must be exact no-ops");
veloContradictory = applyEmailProviderEvent(
  veloContradictory,
  { eventId: "velo_distinct_conflict", providerMessageId: "msg_velo_contradictory", type: "delivered" },
  "2026-08-22T21:00:07.000Z"
);
assert.equal(veloContradictory.automation?.terminal_disposition, null);
assert.equal(veloContradictory.automation?.refund.status, "CREATED");
assert.equal(countsAsVerifiedFirstSale(veloContradictory), false);
veloContradictory = applyRefundProviderEvent(
  veloContradictory,
  { eventId: "velo_refund_succeeded", providerRefundId: "re_velo_contradictory", type: "refund.succeeded" },
  "2026-08-22T21:00:08.000Z"
);
assert.equal(veloContradictory.automation?.terminal_disposition, "REFUNDED");
assert.equal(countsAsVerifiedFirstSale(veloContradictory), false);
assert.equal(veloContradictory.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, 1);
assert.equal(veloContradictory.receipts.filter((receipt) => receipt.kind === "REFUND_ATTEMPT_OWNED").length, 1);
assert.ok(verifyReceiptChain(veloContradictory));

let terminalThenBounce = makeSubmittedOrder("msg_terminal_then_bounce");
terminalThenBounce = applyEmailProviderEvent(
  terminalThenBounce,
  { eventId: "terminal_delivered", providerMessageId: "msg_terminal_then_bounce", type: "delivered" },
  "2026-08-22T20:12:00.000Z"
);
const terminalReceiptCount = terminalThenBounce.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length;
terminalThenBounce = applyEmailProviderEvent(
  terminalThenBounce,
  { eventId: "terminal_late_bounce", providerMessageId: "msg_terminal_then_bounce", type: "hard_bounce" },
  "2026-08-22T20:12:01.000Z"
);
assert.equal(terminalThenBounce.automation?.terminal_disposition, "DELIVERED");
assert.equal(terminalThenBounce.automation?.refund.status, "NOT_REQUIRED");
assert.equal(terminalThenBounce.receipts.filter((receipt) => receipt.kind === "ORDER_TERMINAL").length, terminalReceiptCount);
assert.ok(verifyReceiptChain(terminalThenBounce));

let refundFailure = expireDeliverySla(makeSubmittedOrder("msg_refund_failure"), "2026-08-22T21:00:00.000Z");
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const ownership = claimRefundAttempt(refundFailure, `2026-08-22T21:0${attempt}:00.000Z`);
  assert.equal(ownership.disposition, "acquired");
  refundFailure = applyRefundProviderEvent(
    ownership.order,
    { eventId: `refund_failed_${attempt}`, providerRefundId: "re_retry_fixture", type: "refund.failed" },
    `2026-08-22T21:0${attempt}:01.000Z`
  );
}
assert.equal(refundFailure.automation?.refund.status, "FAILED");
assert.equal(refundFailure.automation?.refund.attempts, 3);
assert.equal(refundFailure.automation?.blocker_code, "DELIVERY_FAILED_REFUND_FAILED");
assert.equal(refundFailure.workflow_status, "BLOCKED");
assert.equal(refundFailure.automation?.terminal_disposition, null);
assert.throws(() => claimRefundAttempt(refundFailure, "2026-08-22T21:10:00.000Z"), /retry budget exhausted/);

const tokenSecret = "fixture-order-token-secret-at-least-32-bytes";
const token = createOrderToken(
  makePaidOrder(),
  "results",
  "tok_fixture_once",
  "2026-08-22T20:10:00.000Z",
  "2026-08-23T20:10:00.000Z",
  tokenSecret
);
const tokenOrder = consumeOrderToken(
  makePaidOrder(),
  token,
  "results",
  "2026-08-22T20:11:00.000Z",
  tokenSecret
);
assert.equal(tokenOrder.automation?.consumed_token_ids.length, 1);
assert.throws(
  () => consumeOrderToken(tokenOrder, token, "results", "2026-08-22T20:12:00.000Z", tokenSecret),
  /already been consumed/
);
const tamperedToken = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
assert.throws(
  () => consumeOrderToken(makePaidOrder(), tamperedToken, "results", "2026-08-22T20:11:00.000Z", tokenSecret),
  /signature is invalid/
);

const validationOrder = makePaidOrder();
const validReport = createReport(validationOrder);
assert.throws(
  () => validateGeneratedReport(validationOrder, { ...validReport, summary: "This is guaranteed to save time." }, new Uint8Array([1])),
  /unsupported claim/
);
assert.throws(
  () => validateGeneratedReport(
    validationOrder,
    { ...validReport, summary: ["rk", "live", "12345678901234567890"].join("_") },
    new Uint8Array([1])
  ),
  /secret-shaped content/
);
assert.ok(verifyReceiptChain(tokenOrder));
assert.ok(!JSON.stringify(delivered.receipts).includes("owner@example.com"));

console.log(
  "OPS_DRAG_REPORT_DELIVERY_REFUND_PASS delivered=1 refunded=1 refund_owners=1 duplicate_provider_writes=1 cross_race=PASS contradictory_sequence=PASS"
);
