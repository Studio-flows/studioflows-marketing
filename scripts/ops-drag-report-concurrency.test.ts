import assert from "node:assert/strict";

import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  type FulfillmentOwnershipResult,
  type OpsDragOrder,
  type OpsDragPaymentAdmission,
  verifyReceiptChain,
} from "../lib/ops-drag-report/order-foundation.ts";

class AtomicOrderHarness {
  private order: OpsDragOrder;
  private revision = 0;
  acquiredWrites = 0;

  constructor(order: OpsDragOrder) {
    this.order = structuredClone(order);
  }

  async claim(payment: OpsDragPaymentAdmission, recordedAt: string): Promise<FulfillmentOwnershipResult> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const observedRevision = this.revision;
      const observed = structuredClone(this.order);
      const transition = claimFulfillmentOwnership(observed, payment, recordedAt);
      await Promise.resolve();

      if (transition.order === observed) return transition;
      if (this.revision !== observedRevision) continue;

      this.order = structuredClone(transition.order);
      this.revision += 1;
      if (transition.disposition === "acquired") this.acquiredWrites += 1;
      return structuredClone(transition);
    }
    throw new Error("Concurrency fixture exhausted its compare-and-swap budget");
  }

  read(): OpsDragOrder {
    return structuredClone(this.order);
  }
}

const submissionId = "f53f4be4-04f6-4bb0-a145-72f37bb2f1de";
const deliveryEmail = "owner@example.com";
const sourceRow = {
  id: submissionId,
  work_email: deliveryEmail,
  company_name: "Example Operations",
  business_model: "Service business",
  primary_pain_area: "Handoffs",
  raw_answers: {},
  metadata: { qualification_score: 12 },
};
const snapshot = createAdmittedSnapshot(sourceRow, submissionId, "2026-08-22T20:00:00.000Z");
const sameSnapshot = createAdmittedSnapshot(sourceRow, submissionId, "2026-08-22T20:05:00.000Z");
const changedSnapshot = createAdmittedSnapshot(
  { ...sourceRow, company_name: "Changed after admission" },
  submissionId,
  "2026-08-22T20:05:00.000Z"
);

assert.equal(snapshot.digest, sameSnapshot.digest, "admission time must not change the immutable snapshot digest");
assert.notEqual(snapshot.digest, changedSnapshot.digest, "changed Ops Check input must change the snapshot digest");

const order = createAdmittedOrder(snapshot);
const harness = new AtomicOrderHarness(order);
const payment: OpsDragPaymentAdmission = {
  checkoutSessionId: "cs_test_concurrent",
  paymentReferenceId: "pi_test_concurrent",
  webhookEventId: "evt_test_concurrent",
  paidAt: "2026-08-22T20:10:00.000Z",
  amountTotal: 2_900,
  currency: "usd",
  customerEmailSha256: "a".repeat(64),
  snapshotDigest: snapshot.digest,
};

const results = await Promise.all(
  Array.from({ length: 32 }, () => harness.claim(payment, "2026-08-22T20:10:01.000Z"))
);
assert.equal(results.filter((result) => result.disposition === "acquired").length, 1);
assert.equal(results.filter((result) => result.disposition === "duplicate").length, 31);
assert.equal(harness.acquiredWrites, 1, "exactly one atomic write may acquire fulfillment ownership");

const afterConcurrentDelivery = harness.read();
assert.equal(afterConcurrentDelivery.fulfillment.lease_owner, results[0].leaseOwner);
assert.equal(afterConcurrentDelivery.processed_event_ids.length, 1);
assert.equal(afterConcurrentDelivery.receipts.length, 2);
assert.ok(verifyReceiptChain(afterConcurrentDelivery));
assert.ok(!JSON.stringify(afterConcurrentDelivery.receipts).includes(deliveryEmail));

const alternateEvent = { ...payment, webhookEventId: "evt_test_concurrent_retry" };
const duplicate = await harness.claim(alternateEvent, "2026-08-22T20:11:00.000Z");
assert.equal(duplicate.disposition, "duplicate");
assert.equal(duplicate.leaseOwner, afterConcurrentDelivery.fulfillment.lease_owner);
assert.equal(harness.acquiredWrites, 1);
assert.equal(harness.read().processed_event_ids.length, 2);
assert.ok(verifyReceiptChain(harness.read()));

console.log("OPS_DRAG_REPORT_CONCURRENT_LEASE_PASS owners=1 duplicates=31");
