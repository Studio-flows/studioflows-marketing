import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  OPS_DRAG_ACCEPTED_SOURCE_HASHES,
  OPS_DRAG_CUSTOMER_CONTRACT,
  OPS_DRAG_PRIVACY_DISCLOSURE,
  assertAcceptedSourceHashes,
  assertBusinessUseInputCeilingAcknowledgment,
  assertCustomerContractClaimCeiling,
  resolveCustomerContractRuntime,
} from "../lib/ops-drag-report/accepted-contract.ts";
import {
  ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS,
  OPS_DRAG_OFFER_VERSION,
  acceptCampaignPauseReadback,
  assessFirstSaleCandidate,
  claimFirstSaleEligibleAtomically,
  createAcquisitionPauseAdapter,
  createFirstSaleControlState,
  evaluateAcquisitionStops,
  requestAcquisitionPause,
  type AcquisitionSnapshot,
  type FirstSaleCandidate,
  type FirstSaleControlState,
  type FirstSaleControlStore,
} from "../lib/ops-drag-report/first-sale-controller.ts";
import {
  REDUCED_TRANSACTION_ALLOWLIST,
  calculateRetentionDueAt,
  createRetentionMutationAdapter,
  planRetentionAction,
  retentionReceiptContainsRawPayload,
  runRetentionCleanupWorker,
  type RetentionRecord,
  type RetentionReceipt,
  type RetentionWorkerStore,
} from "../lib/ops-drag-report/retention-controller.ts";
import {
  eligibilityReceiptContainsRawIdentifier,
  evaluateUnrelatedBuyer,
  type EligibilityReceipt,
  type EligibilitySourceAdapter,
  type EligibilitySourceName,
} from "../lib/ops-drag-report/unrelated-buyer.ts";
import {
  admitGeneratedReport,
  applyEmailProviderEvent,
  OPS_DRAG_REPORT_SCHEMA_VERSION,
  OPS_DRAG_REPORT_TEMPLATE_VERSION,
  startDeliveryAttempt,
  startGenerationAttempt,
  type OpsDragReportDocument,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  type JsonValue,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";

assertAcceptedSourceHashes({ ...OPS_DRAG_ACCEPTED_SOURCE_HASHES });
assert.throws(
  () => assertAcceptedSourceHashes({ ...OPS_DRAG_ACCEPTED_SOURCE_HASHES, acquisition: "0".repeat(64) }),
  /hash mismatch/
);
assert.equal(
  OPS_DRAG_PRIVACY_DISCLOSURE,
  "StudioFlows uses your business email and Ops Check answers only to generate, deliver, support, and verify this automated report. Payment and billing information are handled by Stripe/Link through hosted checkout. Do not submit credentials, payment-card information, regulated data, employee or customer personal data, or confidential raw exports. Unpaid submissions are deleted within 7 days; report inputs and reports within 30 days after delivery or refund; email/order mappings and support messages within 90 days. Minimal transaction and audit records may be retained longer where legally required. Ops Check answers are not used for marketing without separate permission. Contact support@studioflows.co for privacy requests."
);
assert.equal(OPS_DRAG_CUSTOMER_CONTRACT.price, "$29 one time. No subscription. No sales call. No implementation included.");
assertCustomerContractClaimCeiling(JSON.stringify(OPS_DRAG_CUSTOMER_CONTRACT));
for (const forbidden of ["Pinpoints the root cause", "Guaranteed savings", "Available now", "Limited slots", "Tax exempt"]) {
  assert.throws(() => assertCustomerContractClaimCeiling(forbidden), /forbidden public claim/);
}
const heldRuntime = resolveCustomerContractRuntime({ checkoutAccepted: false, deliveryAccepted: false, supportRefundAccepted: false });
assert.deepEqual(heldRuntime, { checkout: null, delivery: null, supportRefund: null });
const acceptedRuntime = resolveCustomerContractRuntime({ checkoutAccepted: true, deliveryAccepted: true, supportRefundAccepted: true });
assert.equal(acceptedRuntime.checkout, OPS_DRAG_CUSTOMER_CONTRACT.howItWorks[1]);
assert.equal(acceptedRuntime.delivery?.receives, OPS_DRAG_CUSTOMER_CONTRACT.runtimeReceives);
assert.equal(acceptedRuntime.supportRefund, OPS_DRAG_CUSTOMER_CONTRACT.supportRefund);
assert.throws(() => assertBusinessUseInputCeilingAcknowledgment(false), /acknowledgment is required/);
assertBusinessUseInputCeilingAcknowledgment(true);
const intakeSource = readFileSync("app/services/custom-ops-hub/CustomOpsHubClient.js", "utf8");
assert.ok(intakeSource.lastIndexOf("{OPS_DRAG_PRIVACY_DISCLOSURE}") < intakeSource.lastIndexOf("checked={businessUseAccepted}"));
assert.ok(intakeSource.includes("business_use_input_ceiling_ack: true"));

const sourceNames: EligibilitySourceName[] = [
  "DIRECTORY_TEAM_TEST",
  "EXISTING_CUSTOMERS_PRIOR_BUYERS",
  "CRM",
  "INTERNAL_PACKAGES_REFUNDED_TESTS",
  "PAYMENT_FINGERPRINTS",
];
function eligibilitySources(overrides: Partial<Record<EligibilitySourceName, Partial<Awaited<ReturnType<EligibilitySourceAdapter["check"]>>>>> = {}) {
  return sourceNames.map<EligibilitySourceAdapter>((name) => ({
    name,
    async check() {
      return {
        available: true,
        fresh: true,
        coverageComplete: true,
        matched: false,
        freshnessReceiptHash: `${name.toLowerCase()}_fresh_hash`,
        coverageReceiptHash: `${name.toLowerCase()}_coverage_hash`,
        ...overrides[name],
      };
    },
  }));
}
const rawEligibilityIds = ["Owner@Example.com", "cus_fixture", "card_fingerprint_fixture"];
const eligibilitySecret = "fixture-eligibility-hmac-secret-more-than-32-bytes";
const eligibilityPass = await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources(),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
});
assert.equal(eligibilityPass.result, "PASS");
assert.equal(eligibilityReceiptContainsRawIdentifier(eligibilityPass, rawEligibilityIds), false);
const [concurrentEligibilityOne, concurrentEligibilityTwo] = await Promise.all([
  evaluateUnrelatedBuyer({ identifiers: rawEligibilityIds, hmacSecret: eligibilitySecret, sources: eligibilitySources(), evaluatedAt: "2026-08-22T20:00:00.000Z" }),
  evaluateUnrelatedBuyer({ identifiers: rawEligibilityIds, hmacSecret: eligibilitySecret, sources: eligibilitySources(), evaluatedAt: "2026-08-22T20:00:00.000Z" }),
]);
assert.deepEqual(concurrentEligibilityOne, concurrentEligibilityTwo);
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { matched: true } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "FAIL");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { fresh: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { available: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { coverageComplete: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: undefined,
  sources: eligibilitySources(),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).blocker_code, "ELIGIBILITY_HMAC_SECRET_UNAVAILABLE");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources().slice(0, 4),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).blocker_code, "ELIGIBILITY_SOURCE_MISSING");

function retentionRecord(dataClass: RetentionRecord["data_class"], payload: Record<string, JsonValue> = {}): RetentionRecord {
  return {
    record_id: `record-${dataClass}`,
    data_class: dataClass,
    last_activity_at: "2028-02-27T00:00:00.000Z",
    terminal_at: "2024-02-29T12:00:00.000Z",
    support_closed_at: "2026-12-31T12:00:00.000Z",
    dispute_resolved_at: null,
    transaction_at: "2024-06-15T12:00:00.000Z",
    legal_hold: null,
    lease: null,
    payload,
  };
}
assert.equal(calculateRetentionDueAt(retentionRecord("UNPAID_SUBMISSION")), "2028-03-05T00:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("RAW_PAID_SUBMISSION")), "2024-03-30T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("EMAIL_ORDER_MAPPING")), "2024-05-29T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("SUPPORT_TRANSCRIPT")), "2027-03-31T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("ATTRIBUTION_AGGREGATE")), "2026-02-28T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("REDUCED_TRANSACTION_RECORD")), "2032-01-01T00:00:00.000Z");
const held = { ...retentionRecord("RAW_ATTRIBUTION"), legal_hold: { id: "hold-1", released_at: null } };
assert.equal(planRetentionAction(held, "2030-01-01T00:00:00.000Z").kind, "HOLD");
assert.equal(planRetentionAction({ ...held, legal_hold: { id: "hold-1", released_at: "2029-01-01T00:00:00.000Z" } }, "2030-01-01T00:00:00.000Z").kind, "DELETE");
const ledgerPayload = {
  order_reference: "odr_fixture",
  amount: 2900,
  currency: "usd",
  terminal_disposition: "DELIVERED",
  receipt_hash: "receipt_fixture",
  full_email: "owner@example.com",
  raw_webhook_payload: "must-delete",
};
const reduction = planRetentionAction(retentionRecord("DETAILED_RECEIPT_LEDGER", ledgerPayload), "2030-01-01T00:00:00.000Z");
assert.equal(reduction.kind, "REDUCE");
if (reduction.kind !== "REDUCE") throw new Error("Expected reduction fixture");
assert.deepEqual(Object.keys(reduction.reduced).sort(), REDUCED_TRANSACTION_ALLOWLIST.filter((key) => key in ledgerPayload).sort());
assert.equal("full_email" in reduction.reduced, false);
assert.throws(() => createRetentionMutationAdapter({ enabled: false, async deleteRecord() {}, async reduceRecord() {} }), /disabled/);

class InMemoryRetentionStore implements RetentionWorkerStore {
  records = new Map<string, RetentionRecord>();
  completed = new Map<string, RetentionReceipt>();
  blocked: string[] = [];
  constructor(records: RetentionRecord[]) { for (const record of records) this.records.set(record.record_id, structuredClone(record)); }
  async loadBatch(limit: number) { return [...this.records.values()].filter((record) => !this.completed.has(record.record_id)).slice(0, limit).map((record) => structuredClone(record)); }
  async claim(recordId: string, owner: string, acquiredAt: string, staleBefore: string) {
    const record = this.records.get(recordId);
    if (!record || this.completed.has(recordId)) return null;
    if (record.lease && Date.parse(record.lease.acquired_at) >= Date.parse(staleBefore)) return null;
    record.lease = { owner, acquired_at: acquiredAt, attempts: (record.lease?.attempts ?? 0) + 1 };
    return structuredClone(record);
  }
  async complete(recordId: string, receipt: RetentionReceipt) { this.completed.set(recordId, receipt); }
  async release(recordId: string, blockerCode: string) { this.blocked.push(`${recordId}:${blockerCode}`); }
}
const dueRecords = Array.from({ length: 12 }, (_, index) => ({
  ...retentionRecord("UNPAID_SUBMISSION", { secret_payload: `raw-${index}` }),
  record_id: `retention-${index}`,
  last_activity_at: "2026-01-01T00:00:00.000Z",
}));
dueRecords[0].lease = { owner: "stale-owner", acquired_at: "2026-01-02T00:00:00.000Z", attempts: 1 };
const retentionStore = new InMemoryRetentionStore(dueRecords);
let retentionMutations = 0;
const retentionAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() { retentionMutations += 1; },
  async reduceRecord() { retentionMutations += 1; },
});
const [cleanupOne, cleanupTwo] = await Promise.all([
  runRetentionCleanupWorker({ store: retentionStore, adapter: retentionAdapter, owner: "wake-one", now: "2026-02-01T00:00:00.000Z", staleBefore: "2026-01-31T00:00:00.000Z" }),
  runRetentionCleanupWorker({ store: retentionStore, adapter: retentionAdapter, owner: "wake-two", now: "2026-02-01T00:00:00.000Z", staleBefore: "2026-01-31T00:00:00.000Z" }),
]);
assert.ok(cleanupOne.scanned <= 10 && cleanupTwo.scanned <= 10);
assert.equal(retentionStore.completed.size, 10);
assert.equal(retentionMutations, 10);
assert.equal(retentionStore.records.get("retention-0")?.lease?.attempts, 2, "stale lease must be reclaimable once");
for (const [recordId, receipt] of retentionStore.completed) {
  assert.equal(retentionReceiptContainsRawPayload(receipt, retentionStore.records.get(recordId)!.payload), false);
}

function createDeliveredOrder(): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({ work_email: "buyer@example.com", raw_answers: {}, metadata: {} }, "first-sale-submission", "2026-08-22T20:00:00.000Z");
  let order = claimFulfillmentOwnership(createAdmittedOrder(snapshot), {
    checkoutSessionId: "cs_live_first_sale",
    paymentReferenceId: "pi_live_first_sale",
    webhookEventId: "evt_live_first_sale",
    paidAt: "2026-08-22T20:01:00.000Z",
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "a".repeat(64),
    snapshotDigest: snapshot.digest,
  }, "2026-08-22T20:01:01.000Z").order;
  order = startGenerationAttempt(order, "2026-08-22T20:01:02.000Z");
  const report: OpsDragReportDocument = {
    schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    order_id: order.order_id,
    submission_id: order.submission_id,
    generated_at: "2026-08-22T20:01:03.000Z",
    title: "Operations Drag Report",
    summary: "Submitted inputs suggest a handoff hypothesis to test.",
    hypotheses: ["The handoff may lack one owner."],
    seven_day_sequence: ["Observe", "Name owner", "Record entry", "Run handoff", "Measure", "Adjust", "Compare"],
    limitations: "Response-based hypotheses only; not an audit or professional advice.",
    evidence_to_collect: ["Wait time"],
  };
  order = admitGeneratedReport(order, report, new TextEncoder().encode("%PDF-1.7 fixture"), "2026-08-22T20:01:04.000Z");
  order = startDeliveryAttempt(order, "msg_first_sale", "2026-08-22T20:01:05.000Z");
  return applyEmailProviderEvent(order, { eventId: "evt_delivered", providerMessageId: "msg_first_sale", type: "delivered" }, "2026-08-22T20:02:00.000Z");
}
const deliveredOrder = createDeliveredOrder();
const validCandidate: FirstSaleCandidate = {
  order: deliveredOrder,
  offerVersion: OPS_DRAG_OFFER_VERSION,
  paymentMode: "live",
  paymentSettled: true,
  reportValidation: "PASS",
  country: "US",
  unrelatedBuyer: eligibilityPass,
  humanTouchesNormalPath: 0,
  sourceHashes: { ...OPS_DRAG_ACCEPTED_SOURCE_HASHES },
  configHashesCurrent: true,
  dispute: false,
  testMarker: false,
  renewalMarker: false,
  internalPackageMarker: false,
  acquisitionSource: "OPS_DRAG_SEARCH_V1",
};
assert.equal(assessFirstSaleCandidate(validCandidate).result, "PASS");
for (const refundStatus of ["REQUIRED", "OWNED", "CREATED", "SUCCEEDED"] as const) {
  const order = structuredClone(deliveredOrder);
  order.workflow_status = refundStatus === "SUCCEEDED" ? "DONE" : "IN_PROGRESS";
  order.automation!.terminal_disposition = refundStatus === "SUCCEEDED" ? "REFUNDED" : null;
  order.automation!.refund.status = refundStatus;
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, order }).blocker_codes.includes("DELIVERY_NOT_PROVIDER_CONFIRMED"));
}
for (const deliveryStatus of ["ACCEPTED", "QUEUED", "SENT"] as const) {
  const order = structuredClone(deliveredOrder);
  order.workflow_status = "IN_PROGRESS";
  order.automation!.terminal_disposition = null;
  order.automation!.delivery.status = deliveryStatus;
  order.automation!.delivery.delivered_at = null;
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, order }).blocker_codes.includes("DELIVERY_NOT_PROVIDER_CONFIRMED"));
}
for (const [delta, blocker] of [
  [{ paymentMode: "test" }, "PAYMENT_NOT_LIVE"],
  [{ reportValidation: "FAIL" }, "REPORT_VALIDATION_NOT_PASS"],
  [{ country: "CA" }, "BUYER_NOT_US"],
  [{ unrelatedBuyer: { ...eligibilityPass, result: "UNVERIFIED" } as EligibilityReceipt }, "UNRELATED_BUYER_UNVERIFIED"],
  [{ humanTouchesNormalPath: 1 }, "HUMAN_TOUCH_PRESENT"],
  [{ dispute: true }, "DISPUTE_PRESENT"],
  [{ testMarker: true }, "TEST_MARKER_PRESENT"],
  [{ renewalMarker: true }, "RENEWAL_MARKER_PRESENT"],
  [{ internalPackageMarker: true }, "INTERNAL_PACKAGE_MARKER_PRESENT"],
] as const) {
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, ...delta }).blocker_codes.includes(blocker));
}

class InMemoryFirstSaleStore implements FirstSaleControlStore {
  state: FirstSaleControlState = createFirstSaleControlState();
  revision = 0;
  async read() { return { state: structuredClone(this.state), revision: String(this.revision) }; }
  async compareAndSwap(expectedRevision: string, next: FirstSaleControlState) {
    await Promise.resolve();
    if (expectedRevision !== String(this.revision)) return false;
    this.state = structuredClone(next);
    this.revision += 1;
    return true;
  }
}
const firstSaleStore = new InMemoryFirstSaleStore();
const concurrentClaims = await Promise.all(Array.from({ length: 20 }, () =>
  claimFirstSaleEligibleAtomically(firstSaleStore, validCandidate, "campaign-fixture")
));
assert.equal(concurrentClaims.filter((result) => result.disposition === "acquired").length, 1);
assert.equal(firstSaleStore.state.status, "FIRST_SALE_ELIGIBLE");

const baseAcquisitionSnapshot: AcquisitionSnapshot = {
  channel: "GOOGLE_SEARCH",
  campaignId: "campaign-fixture",
  campaignState: "PAUSED",
  averageDailyBudgetCents: 500,
  currentDayBilledSpendCents: 0,
  cumulativeBilledSpendCents: 0,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  flightStartedAt: "2026-08-22T00:00:00.000Z",
  now: "2026-08-22T01:00:00.000Z",
  launchHashesCurrent: true,
  deliveryConfigFailure: false,
  privacySecurityCustomerHarm: false,
  checkoutStarts: 1,
  completedChecks: 1,
  providerSpendReceiptPresent: true,
};
let acquisitionCalls = 0;
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: false,
  channel: "GOOGLE_SEARCH",
  campaignId: "campaign-fixture",
  averageDailyBudgetCents: ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause() { acquisitionCalls += 1; return { providerState: "PAUSED", readbackHash: "never" }; } },
}), /disabled/);
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId: "campaign-fixture",
  averageDailyBudgetCents: 501,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause() { acquisitionCalls += 1; return { providerState: "PAUSED", readbackHash: "never" }; } },
}), /\$5\.00/);
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId: "campaign-fixture",
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_001,
  residualExposureReceiptCurrent: true,
  transport: { async pause() { acquisitionCalls += 1; return { providerState: "PAUSED", readbackHash: "never" }; } },
}), /\$10\.00/);
assert.equal(acquisitionCalls, 0);
const stopAdapter = createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId: "campaign-fixture",
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause() { acquisitionCalls += 1; return { providerState: "PAUSED", readbackHash: "pause-readback-hash" }; } },
});
const stopCodes = evaluateAcquisitionStops(baseAcquisitionSnapshot, true);
assert.deepEqual(stopCodes, ["FIRST_SALE_ELIGIBLE"]);
const pause = await requestAcquisitionPause({ adapter: stopAdapter, snapshot: baseAcquisitionSnapshot, stopCodes });
assert.equal(acquisitionCalls, 1);
firstSaleStore.state = acceptCampaignPauseReadback(firstSaleStore.state, {
  orderId: deliveredOrder.order_id,
  idempotencyKey: pause.idempotencyKey,
  providerState: pause.providerState,
  readbackHash: pause.readbackHash,
});
const readbackAgain = acceptCampaignPauseReadback(firstSaleStore.state, {
  orderId: deliveredOrder.order_id,
  idempotencyKey: pause.idempotencyKey,
  providerState: pause.providerState,
  readbackHash: pause.readbackHash,
});
assert.deepEqual(readbackAgain, firstSaleStore.state);
assert.equal(firstSaleStore.state.status, "FIRST_SALE_VERIFIED");
const allStops = evaluateAcquisitionStops({
  ...baseAcquisitionSnapshot,
  currentDayBilledSpendCents: 1_000,
  cumulativeBilledSpendCents: 10_000,
  now: "2026-09-02T00:00:00.000Z",
  launchHashesCurrent: false,
  deliveryConfigFailure: true,
  privacySecurityCustomerHarm: true,
  checkoutStarts: 0,
  completedChecks: 5,
  providerSpendReceiptPresent: false,
}, false);
for (const code of [
  "SPEND_RECEIPT_UNVERIFIED",
  "DAILY_BILLED_CAP",
  "CUMULATIVE_PAUSE_THRESHOLD",
  "ABSOLUTE_TOTAL_CAP",
  "FIXED_FLIGHT_ENDED",
  "LAUNCH_HASH_DRIFT",
  "DELIVERY_OR_CONFIG_FAILURE",
  "PRIVACY_SECURITY_CUSTOMER_HARM",
  "FIFTY_DOLLARS_ZERO_CHECKOUT_STARTS",
  "FIVE_CHECKS_ZERO_CHECKOUT_STARTS",
]) assert.ok(allStops.includes(code as never));

console.log(
  "OPS_DRAG_REPORT_CUSTOMER_CONTROLS_PASS hashes=3 copy=PASS eligibility=PASS retention=PASS first_sale=PASS acquisition_stop=PASS"
);
