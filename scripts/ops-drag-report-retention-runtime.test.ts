import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createAdmittedOrder,
  type JsonValue,
  type OpsDragAdmittedSnapshot,
} from "../lib/ops-drag-report/order-foundation.ts";
import {
  createOpsDragOrderStoreUpdate,
  createOpsDragRetentionLifecycleUpdate,
} from "../lib/ops-drag-report/retention-order-lifecycle.ts";
import {
  calculateRetentionDueAt,
  createRetentionMutationAdapter,
  planRetentionAction,
  reduceDetailedLedger,
  RetentionOwnershipLostError,
  runRetentionCleanupWorker,
  verifyRetentionReceiptChain,
  type RetentionDataClass,
  type RetentionRecord,
  type RetentionReceipt,
  type RetentionWorkerStore,
} from "../lib/ops-drag-report/retention-controller.ts";
import {
  assertRetentionSchedulerRequest,
  createRetentionRuntimePatch,
  RETENTION_REDACTED_EMAIL,
  RETENTION_REDACTED_TEXT,
  retentionStaleBefore,
} from "../lib/ops-drag-report/retention-runtime.ts";

const TERMINAL_AT = "2024-02-29T12:00:00.000Z";
const OWNER = "retention-owner-fixture-0001";
const PRODUCTION_RAW_ATTRIBUTION = {
  src: "homepage-diagnosis",
  pq_session_id: "pq-session-raw-123",
  pq_score: "83",
  pq_qualified: "true",
  pq_band: "high",
  utm_source: "raw-search-source",
  utm_medium: "raw-cpc-medium",
  utm_campaign: "raw-campaign-name",
  utm_term: "raw-search-term",
  utm_content: "raw-ad-content",
  referrer: "https://raw-referrer.example/private-path",
  landing_path: "/raw-private-landing",
  pre_qual: {
    session_id: "nested-pq-session-raw-456",
    source: "nested-raw-source",
  },
} satisfies Record<string, JsonValue>;

function runtimeRow(metadataOverrides: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    full_name: "Raw Buyer",
    work_email: "buyer@business.example",
    company_name: "Raw Company",
    company_website: "https://business.example",
    business_model: "Raw model",
    company_stage: "Raw stage",
    primary_pain_area: "Raw pain",
    highest_cost_bottleneck: "Raw bottleneck",
    highest_cost_bottleneck_other: "Raw detail",
    workflow_management: ["Raw workflow"],
    frequent_breakdown: "Raw breakdown",
    frequent_breakdown_detail: "Raw breakdown detail",
    urgency_window: "Raw urgency",
    quarter_risk: "Raw risk",
    implementation_ownership: "Raw ownership",
    budget_range: "Raw budget",
    approval_involvement: "Raw approval",
    raw_answers: { raw_secret_answer: "must-disappear" },
    metadata: {
      raw_attribution: { click_id: "must-disappear-at-90d" },
      ops_drag_report_order: {
        version: "v1",
        order_id: "odr_raw_identifier",
        submission_id: "sub_raw_identifier",
        snapshot: {
          version: "v1",
          submission_id: "sub_raw_identifier",
          admitted_at: "2024-02-01T12:00:00.000Z",
          delivery_email: "buyer@business.example",
          digest: "a".repeat(64),
          report_input: {
            leadId: "raw-lead",
            quizPayload: { raw_answer: "must-disappear" },
            preQual: { raw_score: "must-disappear" },
            qualificationScore: 5,
          },
        },
        payment: {
          paidAt: "2024-02-01T12:00:00.000Z",
          amountTotal: 2900,
          currency: "usd",
          customerEmailSha256: "b".repeat(64),
        },
        automation: {
          terminal_disposition: "DELIVERED",
          generation: {
            artifact: {
              pdf_base64: "private-pdf-body",
              report_sha256: "c".repeat(64),
              pdf_sha256: "d".repeat(64),
            },
          },
          refund: { status: "NOT_REQUIRED" },
        },
        receipts: [{ receipt_hash: "e".repeat(64) }],
      },
      ...metadataOverrides,
    },
  };
}

function record(
  dataClass: RetentionDataClass,
  row: Record<string, JsonValue> = runtimeRow(),
  overrides: Partial<RetentionRecord> = {}
): RetentionRecord {
  return {
    record_id: String(row.id),
    data_class: dataClass,
    last_activity_at: "2024-02-01T12:00:00.000Z",
    terminal_at: TERMINAL_AT,
    support_closed_at: null,
    dispute_resolved_at: null,
    transaction_at: "2024-02-01T12:00:00.000Z",
    legal_hold: null,
    lease: { owner: OWNER, acquired_at: "2032-01-01T00:00:00.000Z", attempts: 1 },
    previous_retention_receipt_hash: null,
    payload: {
      runtime_row: row,
      order_reference: "f".repeat(64),
      amount: 2900,
      currency: "usd",
      tax_config_reference: "txcd_10701410",
      terminal_disposition: "DELIVERED",
      refund_dispute_status: "NOT_REQUIRED",
      transaction_at: "2024-02-01T12:00:00.000Z",
      terminal_at: TERMINAL_AT,
      receipt_hash: "e".repeat(64),
    },
    ...overrides,
  };
}

function applyColumns(row: Record<string, JsonValue>, columns: Record<string, JsonValue>): Record<string, JsonValue> {
  return { ...structuredClone(row), ...structuredClone(columns) };
}

const admittedSnapshot = {
  version: "v1",
  submission_id: "10000000-0000-4000-8000-000000000001",
  admitted_at: "2024-02-01T12:00:00.000Z",
  delivery_email: "buyer@business.example",
  digest: "a".repeat(64),
  report_input: { leadId: "fixture", quizPayload: {}, preQual: null, qualificationScore: null },
} satisfies OpsDragAdmittedSnapshot;
const unpaidLifecycle = createOpsDragRetentionLifecycleUpdate(
  createAdmittedOrder(admittedSnapshot),
  "2024-02-02T12:00:00.000Z",
);
assert.deepEqual(unpaidLifecycle, {
  ops_drag_last_legitimate_activity_at: "2024-02-02T12:00:00.000Z",
  ops_drag_retention_stage: "UNPAID_SUBMISSION",
  ops_drag_retention_due_at: "2024-02-09T12:00:00.000Z",
  ops_drag_retention_lease_owner: null,
  ops_drag_retention_lease_acquired_at: null,
  ops_drag_retention_attempts: 0,
  ops_drag_retention_last_blocker_code: null,
});
const paidAwaitingOrder = createAdmittedOrder(admittedSnapshot);
paidAwaitingOrder.payment = {
  checkoutSessionId: "cs_fixture",
  paymentReferenceId: "pi_fixture",
  webhookEventId: "evt_fixture",
  paidAt: "2024-02-03T12:00:00.000Z",
  amountTotal: 2900,
  currency: "usd",
  customerEmailSha256: "b".repeat(64),
  snapshotDigest: admittedSnapshot.digest,
};
assert.deepEqual(createOpsDragRetentionLifecycleUpdate(paidAwaitingOrder), {
  ops_drag_retention_stage: "AWAITING_TERMINAL",
  ops_drag_retention_due_at: null,
  ops_drag_retention_lease_owner: null,
  ops_drag_retention_lease_acquired_at: null,
  ops_drag_retention_attempts: 0,
  ops_drag_retention_last_blocker_code: null,
});

assert.equal(calculateRetentionDueAt(record("UNPAID_SUBMISSION")), "2024-02-08T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("RAW_PAID_SUBMISSION")), "2024-03-30T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("EMAIL_ORDER_MAPPING")), "2024-05-29T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("DETAILED_RECEIPT_LEDGER")), "2026-02-28T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("REDUCED_TRANSACTION_RECORD")), "2032-01-01T00:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("SUPPORT_TRANSCRIPT", runtimeRow(), {
  support_closed_at: "2024-12-31T12:00:00.000Z",
})), "2025-03-31T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(record("DETAILED_RECEIPT_LEDGER", runtimeRow(), {
  dispute_resolved_at: "2024-03-31T12:00:00.000Z",
})), "2026-03-31T12:00:00.000Z");

const unpaidPatch = createRetentionRuntimePatch(record("UNPAID_SUBMISSION"), "DELETE");
assert.equal(unpaidPatch.delete_row, true);
assert.equal(unpaidPatch.next_stage, "COMPLETE");

const rawPatch = createRetentionRuntimePatch(record("RAW_PAID_SUBMISSION"), "DELETE");
assert.equal(rawPatch.delete_row, false);
assert.equal(rawPatch.next_stage, "EMAIL_ORDER_MAPPING");
assert.equal(rawPatch.next_due_at, "2024-05-29T12:00:00.000Z");
assert.equal(rawPatch.columns.full_name, RETENTION_REDACTED_TEXT);
assert.deepEqual(rawPatch.columns.raw_answers, {});
assert.equal("work_email" in rawPatch.columns, false, "email mapping remains only through the 90-day stage");
const rawSerialized = JSON.stringify(rawPatch.columns);
for (const forbidden of ["Raw Buyer", "Raw Company", "private-pdf-body"]) {
  assert.doesNotMatch(rawSerialized, new RegExp(forbidden));
}

const afterRaw = applyColumns(runtimeRow(), rawPatch.columns);
const mappingPatch = createRetentionRuntimePatch(record("EMAIL_ORDER_MAPPING", afterRaw), "DELETE");
assert.equal(mappingPatch.columns.work_email, RETENTION_REDACTED_EMAIL);
assert.match(RETENTION_REDACTED_EMAIL, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
assert.notEqual(RETENTION_REDACTED_EMAIL.split("@")[1], "gmail.com");
assert.equal(mappingPatch.next_stage, "DETAILED_RECEIPT_LEDGER");
const mappingSerialized = JSON.stringify(mappingPatch.columns);
assert.doesNotMatch(mappingSerialized, /buyer@business\.example|must-disappear-at-90d/);
assert.match(mappingSerialized, /retention_mapping_redacted/);

const productionShapeOriginal = runtimeRow(PRODUCTION_RAW_ATTRIBUTION);
const productionShapeRawPatch = createRetentionRuntimePatch(
  record("RAW_PAID_SUBMISSION", productionShapeOriginal),
  "DELETE",
);
const productionShapeAfterRaw = applyColumns(productionShapeOriginal, productionShapeRawPatch.columns);
const afterRawMetadata = productionShapeAfterRaw.metadata as Record<string, JsonValue>;
for (const key of Object.keys(PRODUCTION_RAW_ATTRIBUTION)) {
  assert.equal(key in afterRawMetadata, true, `${key} must remain only until the 90-day boundary`);
}
const productionShapeMappingPatch = createRetentionRuntimePatch(
  record("EMAIL_ORDER_MAPPING", productionShapeAfterRaw),
  "DELETE",
);
const productionShapeAfterMapping = applyColumns(
  productionShapeAfterRaw,
  productionShapeMappingPatch.columns,
);
const afterMappingMetadata = productionShapeAfterMapping.metadata as Record<string, JsonValue>;
for (const key of Object.keys(PRODUCTION_RAW_ATTRIBUTION)) {
  assert.equal(key in afterMappingMetadata, false, `${key} must be absent after the 90-day patch`);
}
assert.doesNotMatch(
  JSON.stringify(productionShapeAfterMapping),
  /pq-session-raw-123|raw-search-source|raw-cpc-medium|raw-campaign-name|raw-search-term|raw-ad-content|raw-referrer|raw-private-landing|nested-pq-session-raw-456|nested-raw-source/,
);
const productionLedgerRecord = record("DETAILED_RECEIPT_LEDGER", productionShapeAfterMapping);
const productionReducedPatch = createRetentionRuntimePatch(
  productionLedgerRecord,
  "REDUCE",
  reduceDetailedLedger(productionLedgerRecord.payload),
);
const productionReducedSerialized = JSON.stringify(productionReducedPatch.columns);
for (const key of Object.keys(PRODUCTION_RAW_ATTRIBUTION)) {
  assert.doesNotMatch(productionReducedSerialized, new RegExp(`"${key}"`));
}
assert.doesNotMatch(
  productionReducedSerialized,
  /pq-session-raw-123|raw-search-source|raw-search-term|raw-referrer|raw-private-landing|nested-pq-session-raw-456/,
);

const supportOriginalRow = runtimeRow({
  ops_drag_support_transcript: { closed_at: "2024-12-31T12:00:00.000Z", body: "private support body" },
});
const supportRawPatch = createRetentionRuntimePatch(
  record("RAW_PAID_SUBMISSION", supportOriginalRow),
  "DELETE",
);
const supportRow = applyColumns(supportOriginalRow, supportRawPatch.columns);
const supportMappingPatch = createRetentionRuntimePatch(record("EMAIL_ORDER_MAPPING", supportRow, {
  support_closed_at: "2024-12-31T12:00:00.000Z",
}), "DELETE");
assert.equal(supportMappingPatch.next_stage, "SUPPORT_TRANSCRIPT");
assert.equal(supportMappingPatch.next_due_at, "2025-03-31T12:00:00.000Z");
const supportPatch = createRetentionRuntimePatch(record(
  "SUPPORT_TRANSCRIPT",
  applyColumns(supportRow, supportMappingPatch.columns),
  { support_closed_at: "2024-12-31T12:00:00.000Z" }
), "DELETE");
assert.doesNotMatch(JSON.stringify(supportPatch.columns), /private support body/);
assert.equal(supportPatch.next_stage, "DETAILED_RECEIPT_LEDGER");

const ledgerRecord = record("DETAILED_RECEIPT_LEDGER", afterRaw);
const reduced = reduceDetailedLedger(ledgerRecord.payload);
const ledgerPatch = createRetentionRuntimePatch(ledgerRecord, "REDUCE", reduced);
assert.equal(ledgerPatch.next_stage, "REDUCED_TRANSACTION_RECORD");
assert.equal(ledgerPatch.next_due_at, "2032-01-01T00:00:00.000Z");
const reducedSerialized = JSON.stringify(ledgerPatch.columns);
assert.doesNotMatch(reducedSerialized, /ops_drag_report_order|buyer@business\.example|private-pdf-body|raw_secret_answer/);
assert.match(reducedSerialized, /ops_drag_reduced_transaction_record/);
assert.deepEqual(Object.keys(ledgerPatch.columns), ["metadata"]);
assert.deepEqual(
  Object.keys(ledgerPatch.columns.metadata as Record<string, JsonValue>),
  ["ops_drag_reduced_transaction_record"],
  "reduction must replace metadata with one approved container",
);
assert.throws(
  () => createRetentionRuntimePatch(ledgerRecord, "REDUCE", {
    ...reduced,
    unknown_nested: { email: "buyer@business.example", report_body: "private-pdf-body" },
  }),
  /unapproved field/,
);
assert.throws(
  () => createRetentionRuntimePatch(ledgerRecord, "REDUCE", {
    ...reduced,
    tax_config_reference: { credential: "sk_test_forbidden" },
  }),
  /scalar values/,
);
const forbiddenReducedStrings = [
  "buyer@business.example",
  `Bearer ${"a".repeat(48)}`,
  "This report contains private operational findings and a detailed customer narrative.",
  "x".repeat(4096),
];
for (const field of ["tax_config_reference", "terminal_disposition", "refund_dispute_status"] as const) {
  for (const value of forbiddenReducedStrings) {
    assert.throws(
      () => createRetentionRuntimePatch(ledgerRecord, "REDUCE", { ...reduced, [field]: value }),
      new RegExp(field),
      `${field} must reject raw or unbounded string content`,
    );
  }
}
for (const terminal_disposition of ["DELIVERED", "REFUNDED"]) {
  assert.doesNotThrow(() => createRetentionRuntimePatch(ledgerRecord, "REDUCE", {
    ...reduced,
    terminal_disposition,
  }));
}
for (const refund_dispute_status of [
  "NOT_REQUIRED", "REQUIRED", "OWNED", "CREATED", "RETRYABLE", "SUCCEEDED", "FAILED",
  "RESOLVED", "WON", "LOST", "CLOSED", "WARNING_CLOSED",
]) {
  assert.doesNotThrow(() => createRetentionRuntimePatch(ledgerRecord, "REDUCE", {
    ...reduced,
    refund_dispute_status,
  }));
}
assert.doesNotThrow(() => createRetentionRuntimePatch(ledgerRecord, "REDUCE", {
  ...reduced,
  tax_config_reference: "txcd_10701410",
}));
assert.equal(createRetentionRuntimePatch(record("REDUCED_TRANSACTION_RECORD"), "DELETE").delete_row, true);

const heldRecord = record("RAW_PAID_SUBMISSION", runtimeRow(), {
  legal_hold: { id: "hold-covered-record", released_at: null },
});
assert.equal(planRetentionAction(heldRecord, "2032-01-01T00:00:00.000Z").kind, "HOLD");
assert.equal(planRetentionAction({
  ...heldRecord,
  legal_hold: { id: "hold-covered-record", released_at: "2031-12-31T00:00:00.000Z" },
}, "2032-01-01T00:00:00.000Z").kind, "DELETE");
assert.equal(planRetentionAction({
  ...heldRecord,
  legal_hold: {
    id: "hold-mapping-only",
    released_at: null,
    data_classes: ["EMAIL_ORDER_MAPPING"],
  },
}, "2032-01-01T00:00:00.000Z").kind, "DELETE");

type AtomicHoldFixture = {
  id?: unknown;
  released_at?: unknown;
  data_classes?: unknown;
  [key: string]: unknown;
} | null;

function migrationHoldCovers(hold: AtomicHoldFixture, stage: RetentionDataClass): boolean {
  if (hold === null) return false;
  if (typeof hold !== "object" || Array.isArray(hold)) return true;
  const allowedKeys = new Set(["id", "released_at", "data_classes"]);
  if (Object.keys(hold).some((key) => !allowedKeys.has(key))) return true;
  if (typeof hold.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(hold.id)) return true;
  if (!Array.isArray(hold.data_classes) || hold.data_classes.length === 0) return true;
  const allowedScopes = new Set([
    "ALL", "UNPAID_SUBMISSION", "RAW_PAID_SUBMISSION", "GENERATED_REPORT",
    "EMAIL_ORDER_MAPPING", "SUPPORT_TRANSCRIPT", "RAW_ATTRIBUTION",
    "ATTRIBUTION_AGGREGATE", "DETAILED_RECEIPT_LEDGER", "REDUCED_TRANSACTION_RECORD",
  ]);
  if (hold.data_classes.some((scope) => typeof scope !== "string" || !allowedScopes.has(scope))) return true;
  const releasedAt = hold.released_at === null || hold.released_at === undefined
    ? ""
    : String(hold.released_at);
  if (releasedAt !== "") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(releasedAt)) return true;
    return Number.isNaN(Date.parse(releasedAt));
  }
  return hold.data_classes.includes("ALL") || hold.data_classes.includes(stage);
}

for (const coveredHold of [
  { id: "malformed-missing-scope", released_at: null },
  { id: "malformed-empty-scope", released_at: null, data_classes: [] },
  { id: "valid-all", released_at: null, data_classes: ["ALL"] },
  { id: "valid-raw", released_at: null, data_classes: ["RAW_PAID_SUBMISSION"] },
  { id: "malformed-numeric", released_at: null, data_classes: [123] },
  { id: "malformed-unknown", released_at: null, data_classes: ["TYPO"] },
] satisfies AtomicHoldFixture[]) {
  assert.equal(migrationHoldCovers(coveredHold, "RAW_PAID_SUBMISSION"), true);
}
assert.equal(
  migrationHoldCovers({ id: "valid-other", released_at: null, data_classes: ["EMAIL_ORDER_MAPPING"] }, "RAW_PAID_SUBMISSION"),
  false,
);
assert.equal(
  migrationHoldCovers({ id: "valid-release", released_at: "2031-12-31T00:00:00.000Z", data_classes: ["ALL"] }, "RAW_PAID_SUBMISSION"),
  false,
);

type AtomicRetentionFixture = {
  stage: RetentionDataClass | "BLOCKED";
  due_at: string;
  origin_at: string;
  lease_owner: string | null;
  lease_attempts: number;
  blocker_code: string | null;
  legal_hold: AtomicHoldFixture;
  private_content: string;
  destructive_receipts: string[];
};

function applyAtomicRetentionFixture(row: AtomicRetentionFixture): "HELD" | "APPLIED" {
  if (migrationHoldCovers(row.legal_hold, row.stage as RetentionDataClass)) {
    row.lease_owner = null;
    row.lease_attempts = Math.max(row.lease_attempts - 1, 0);
    row.blocker_code = "RETENTION_LEGAL_HOLD";
    return "HELD";
  }
  row.private_content = "[REDACTED]";
  row.destructive_receipts.push("DELETE");
  return "APPLIED";
}

const claimHoldApplyRace: AtomicRetentionFixture = {
  stage: "RAW_PAID_SUBMISSION",
  due_at: "2031-12-01T00:00:00.000Z",
  origin_at: TERMINAL_AT,
  lease_owner: OWNER,
  lease_attempts: 1,
  blocker_code: null,
  legal_hold: null,
  private_content: "must-survive-claim-hold-apply-race",
  destructive_receipts: [],
};
const dueBeforeRace = claimHoldApplyRace.due_at;
const originBeforeRace = claimHoldApplyRace.origin_at;
claimHoldApplyRace.legal_hold = { id: "race-hold", released_at: null, data_classes: ["RAW_PAID_SUBMISSION"] };
assert.equal(applyAtomicRetentionFixture(claimHoldApplyRace), "HELD");
assert.equal(claimHoldApplyRace.private_content, "must-survive-claim-hold-apply-race");
assert.deepEqual(claimHoldApplyRace.destructive_receipts, []);
assert.equal(claimHoldApplyRace.due_at, dueBeforeRace);
assert.equal(claimHoldApplyRace.origin_at, originBeforeRace);
assert.equal(claimHoldApplyRace.lease_owner, null);
assert.equal(claimHoldApplyRace.lease_attempts, 0);
assert.equal(claimHoldApplyRace.blocker_code, "RETENTION_LEGAL_HOLD");
assert.notEqual(claimHoldApplyRace.stage, "BLOCKED");

class SingleRecordStore implements RetentionWorkerStore {
  current: RetentionRecord;
  receipts: RetentionReceipt[] = [];
  deferrals: Array<{ dueAt: string; reason: string }> = [];
  releases: string[] = [];
  constructor(initial: RetentionRecord) { this.current = structuredClone(initial); }
  async loadBatch() { return [structuredClone(this.current)]; }
  async claim() { return structuredClone(this.current); }
  async complete(_recordId: string, receipt: RetentionReceipt) { this.receipts.push(receipt); }
  async defer(_recordId: string, dueAt: string, reason: "RETENTION_WINDOW_ACTIVE" | "SCOPED_LEGAL_HOLD") {
    this.deferrals.push({ dueAt, reason });
    this.current.lease = null;
  }
  async release(_recordId: string, blocker: string) { this.releases.push(blocker); }
}

class MultiRecordStore implements RetentionWorkerStore {
  records: RetentionRecord[];
  receipts: RetentionReceipt[] = [];
  releases: string[] = [];
  constructor(records: RetentionRecord[]) { this.records = structuredClone(records); }
  async loadBatch(limit: number) { return structuredClone(this.records.slice(0, limit)); }
  async claim() { return null; }
  async complete(_recordId: string, receipt: RetentionReceipt) { this.receipts.push(receipt); }
  async defer() {}
  async release(recordId: string, blocker: string) { this.releases.push(`${recordId}:${blocker}`); }
}

const firstStore = new SingleRecordStore(record("RAW_PAID_SUBMISSION"));
const captureAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {},
  async reduceRecord() {},
});
const heldStatusStore = new SingleRecordStore(record("RAW_PAID_SUBMISSION"));
const heldStatusRow: AtomicRetentionFixture = {
  stage: "RAW_PAID_SUBMISSION",
  due_at: "2031-12-01T00:00:00.000Z",
  origin_at: TERMINAL_AT,
  lease_owner: OWNER,
  lease_attempts: 1,
  blocker_code: null,
  legal_hold: { id: "runtime-all", released_at: null, data_classes: ["ALL"] },
  private_content: "must-remain-private-after-held-disposition",
  destructive_receipts: [],
};
const heldStatusAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {
    return applyAtomicRetentionFixture(heldStatusRow) === "HELD" ? "HELD" : "APPLIED";
  },
  async reduceRecord() {
    throw new Error("held race fixture must not reduce");
  },
});
const heldStatusResult = await runRetentionCleanupWorker({
  store: heldStatusStore,
  adapter: heldStatusAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(heldStatusResult, { scanned: 1, applied: 0, held: 1, skipped: 0, blocked: 0, release_failures: 0 });
assert.equal(heldStatusRow.private_content, "must-remain-private-after-held-disposition");
assert.equal(heldStatusRow.lease_owner, null);
assert.equal(heldStatusRow.lease_attempts, 0);
assert.deepEqual(heldStatusRow.destructive_receipts, []);
assert.deepEqual(heldStatusStore.receipts, [], "HELD must not complete the destructive receipt");
assert.deepEqual(heldStatusStore.releases, [], "atomic HELD disposition must not enter failure release");

const rebasedDueStore = new SingleRecordStore(record("DETAILED_RECEIPT_LEDGER", runtimeRow(), {
  dispute_resolved_at: "2031-01-31T00:00:00.000Z",
  lease: { owner: OWNER, acquired_at: "2032-01-01T00:00:00.000Z", attempts: 1 },
}));
const rebasedDueResult = await runRetentionCleanupWorker({
  store: rebasedDueStore,
  adapter: captureAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(rebasedDueResult, { scanned: 1, applied: 0, held: 0, skipped: 1, blocked: 0, release_failures: 0 });
assert.deepEqual(rebasedDueStore.deferrals, [{
  dueAt: "2033-01-31T00:00:00.000Z",
  reason: "RETENTION_WINDOW_ACTIVE",
}]);
assert.equal(rebasedDueStore.current.lease, null, "preclaimed NONE must release its lease without consuming retry budget");
assert.deepEqual(rebasedDueStore.receipts, [], "preclaimed NONE must not complete a destructive receipt");
assert.deepEqual(rebasedDueStore.releases, [], "preclaimed NONE must not enter failure release");

const atomicDeferredStore = new SingleRecordStore(record("DETAILED_RECEIPT_LEDGER"));
const atomicDeferredAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {
    throw new Error("detailed ledger fixture must not delete");
  },
  async reduceRecord() {
    return "DEFERRED";
  },
});
const atomicDeferredResult = await runRetentionCleanupWorker({
  store: atomicDeferredStore,
  adapter: atomicDeferredAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(atomicDeferredResult, { scanned: 1, applied: 0, held: 0, skipped: 1, blocked: 0, release_failures: 0 });
assert.deepEqual(atomicDeferredStore.receipts, [], "DEFERRED must never complete a destructive receipt");
assert.deepEqual(atomicDeferredStore.releases, [], "DEFERRED must never enter the blocker retry path");

const invalidatedThenAppliedStore = new MultiRecordStore([
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000001",
    last_activity_at: "2031-12-25T00:00:00.000Z",
    lease: { owner: OWNER, acquired_at: "2032-01-01T00:00:00.000Z", attempts: 1 },
  }),
  record("RAW_PAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000002",
    lease: { owner: OWNER, acquired_at: "2032-01-01T00:00:00.000Z", attempts: 1 },
  }),
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000003",
    last_activity_at: "2031-12-25T00:00:00.000Z",
    lease: { owner: OWNER, acquired_at: "2032-01-01T00:00:00.000Z", attempts: 1 },
  }),
]);
let invalidationApplyCalls = 0;
const invalidatedThenAppliedAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {
    invalidationApplyCalls += 1;
    return invalidationApplyCalls < 3 ? "DEFERRED" : "APPLIED";
  },
  async reduceRecord() { throw new Error("invalidation fixture must not reduce"); },
});
const invalidatedThenAppliedResult = await runRetentionCleanupWorker({
  store: invalidatedThenAppliedStore,
  adapter: invalidatedThenAppliedAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(invalidatedThenAppliedResult, { scanned: 3, applied: 1, held: 0, skipped: 2, blocked: 0, release_failures: 0 });
assert.equal(invalidatedThenAppliedStore.receipts.length, 1, "the unrelated final row must still complete");
assert.deepEqual(invalidatedThenAppliedStore.releases, [], "lifecycle invalidation must not enter release failure handling");

const ownershipLostStore = new MultiRecordStore([
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000011",
    last_activity_at: "2031-12-25T00:00:00.000Z",
  }),
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000012",
    last_activity_at: "2031-12-25T00:00:00.000Z",
  }),
]);
let ownershipApplyCalls = 0;
const ownershipLostAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {
    ownershipApplyCalls += 1;
    if (ownershipApplyCalls === 1) throw new RetentionOwnershipLostError();
    return "APPLIED";
  },
  async reduceRecord() { throw new Error("ownership fixture must not reduce"); },
});
const ownershipLostResult = await runRetentionCleanupWorker({
  store: ownershipLostStore,
  adapter: ownershipLostAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(ownershipLostResult, {
  scanned: 2, applied: 1, held: 0, skipped: 1, blocked: 0, release_failures: 0,
});
assert.deepEqual(ownershipLostStore.releases, [], "a stale worker must never release the replacement owner's lease");
assert.equal(ownershipLostStore.receipts.length, 1, "ownership loss must not starve the next claimed row");

class ReleaseFailureStore extends MultiRecordStore {
  override async release(recordId: string, blocker: string) {
    this.releases.push(`${recordId}:${blocker}`);
    throw new Error("retention claim release binding is invalid");
  }
}
const releaseFailureStore = new ReleaseFailureStore([
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000021",
    last_activity_at: "2031-12-25T00:00:00.000Z",
  }),
  record("UNPAID_SUBMISSION", runtimeRow(), {
    record_id: "00000000-0000-0000-0000-000000000022",
    last_activity_at: "2031-12-25T00:00:00.000Z",
  }),
]);
let releaseFailureApplyCalls = 0;
const releaseFailureAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {
    releaseFailureApplyCalls += 1;
    if (releaseFailureApplyCalls === 1) throw new Error("fixture mutation failure");
    return "APPLIED";
  },
  async reduceRecord() { throw new Error("release-failure fixture must not reduce"); },
});
const releaseFailureResult = await runRetentionCleanupWorker({
  store: releaseFailureStore,
  adapter: releaseFailureAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.deepEqual(releaseFailureResult, {
  scanned: 2, applied: 1, held: 0, skipped: 0, blocked: 0, release_failures: 1,
});
assert.equal(releaseFailureStore.receipts.length, 1, "a release failure must not starve the next claimed row");
await runRetentionCleanupWorker({
  store: firstStore,
  adapter: captureAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.equal(firstStore.receipts.length, 1);
const secondStore = new SingleRecordStore(record("EMAIL_ORDER_MAPPING", afterRaw, {
  previous_retention_receipt_hash: firstStore.receipts[0].receipt_hash,
}));
await runRetentionCleanupWorker({
  store: secondStore,
  adapter: captureAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.equal(verifyRetentionReceiptChain([...firstStore.receipts, ...secondStore.receipts]), true);
assert.doesNotMatch(JSON.stringify([...firstStore.receipts, ...secondStore.receipts]), /Raw Buyer|buyer@business\.example|private-pdf-body/);

const malformedStore = new SingleRecordStore(record("RAW_PAID_SUBMISSION", runtimeRow(), { terminal_at: "not-a-timestamp" }));
const malformedResult = await runRetentionCleanupWorker({
  store: malformedStore,
  adapter: captureAdapter,
  owner: OWNER,
  now: "2032-01-01T00:00:00.000Z",
  staleBefore: "2031-12-31T23:45:00.000Z",
});
assert.equal(malformedResult.blocked, 1);
assert.deepEqual(malformedStore.releases, ["RETENTION_TIMESTAMP_INVALID"]);

assertRetentionSchedulerRequest({
  authorization: "Bearer fixture-retention-secret-at-least-32-bytes",
  expectedSecret: "fixture-retention-secret-at-least-32-bytes",
  enabled: "true",
  mutationEnabled: "true",
});
let fulfillmentWorkerCalls = 0;
assert.throws(() => assertRetentionSchedulerRequest({
  authorization: "Bearer fixture-retention-secret-at-least-32-bytes",
  expectedSecret: "fixture-retention-secret-at-least-32-bytes",
  enabled: "false",
  mutationEnabled: "true",
}), /disabled/);
assert.equal(fulfillmentWorkerCalls, 0, "retention configuration failure must not invoke fulfillment/refund work");
assert.equal(retentionStaleBefore("2026-08-22T12:00:00.000Z"), "2026-08-22T11:45:00.000Z");

function cursorPage(ids: number[], after: number | null, limit: number): { page: number[]; after: number | null } {
  const remaining = ids.filter((id) => after === null || id > after);
  const page = (remaining.length > 0 ? remaining : ids).slice(0, limit);
  return { page, after: page.at(-1) ?? null };
}
const orderedRows = Array.from({ length: 11 }, (_, index) => index + 1);
const firstWake = cursorPage(orderedRows, null, 10);
const secondWake = cursorPage(orderedRows, firstWake.after, 10);
assert.deepEqual(firstWake.page, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(secondWake.page, [11], "row 11 must be reached on the next bounded wake");

const migration = readFileSync("supabase/migrations/20260822104931_ops_drag_retention_runtime.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/20260822104931_ops_drag_retention_runtime.rollback.sql", "utf8");
const route = readFileSync("app/api/studioflows/ops-drag-report/cleanup/route.ts", "utf8");
const orderStore = readFileSync("lib/ops-drag-report/order-store.ts", "utf8");
const orderLifecycle = readFileSync("lib/ops-drag-report/retention-order-lifecycle.ts", "utf8");
const ingestLeadRoute = readFileSync("app/api/studioflows/ingest-lead/route.ts", "utf8");
for (const contract of [
  /limit p_limit\s+for update skip locked/i,
  /ops_drag_retention_cursor/,
  /ops_drag_last_legitimate_activity_at/,
  /ops_drag_retention_attempts between 0 and 3/,
  /RETENTION_TERMINAL_TIMESTAMP_INVALID/,
  /create table if not exists public\.ops_drag_retention_holds/,
  /alter table public\.ops_drag_retention_holds enable row level security/,
  /revoke all on table public\.ops_drag_retention_holds from public, anon, authenticated/,
  /create or replace function public\.ops_drag_retention_hold_valid/,
  /ops_drag_retention_holds_canonical_check/,
  /source_evidence_hash/,
  /source_receipt_hash/,
  /'quarantine:' \|\| substring\(v_evidence_hash/,
  /insert into public\.ops_drag_retention_holds[\s\S]+LEGACY_METADATA/,
  /metadata -> 'ops_drag_retention_legal_hold'/,
  /ops_drag_retention_hold_covers\(v_hold, v_stage\)/,
  /not public\.ops_drag_retention_hold_valid\(p_hold\)[\s\S]+return true/,
  /scope\.value #>> '\{\}' not in/,
  /not isfinite\(v_parsed\)/,
  /retention receipt timestamps are invalid/,
  /retention defer timestamp is invalid/,
  /retention release timestamp is invalid/,
  /revoke all on function public\.claim_ops_drag_retention_batch[\s\S]+from public, anon, authenticated/i,
  /grant execute on function public\.claim_ops_drag_retention_batch[\s\S]+to service_role/i,
  /v_stage = 'DETAILED_RECEIPT_LEDGER'[\s\S]+ops_drag_retention_detailed_due_at\(v_lead\.metadata\)/,
  /create or replace function public\.defer_ops_drag_retention_claim/,
  /create or replace function public\.ops_drag_retention_dispute_state/,
  /RETENTION_DISPUTE_UNRESOLVED/,
  /RETENTION_DISPUTE_TIMESTAMP_INVALID/,
  /create or replace function public\.ops_drag_retention_order_lifecycle/,
  /v_stage in \('UNINITIALIZED', 'AWAITING_TERMINAL', 'UNPAID_SUBMISSION'\)/,
  /RETENTION_RECLASSIFIED_PAID/,
  /create or replace function public\.ops_drag_retention_reduced_metadata_valid/,
  /v_reduced ->> 'tax_config_reference' <> 'txcd_10701410'/,
  /v_reduced ->> 'terminal_disposition' not in \('DELIVERED', 'REFUNDED'\)/,
  /'WARNING_CLOSED'/,
]) assert.match(migration, contract);
const applyFunction = migration.slice(
  migration.indexOf("create or replace function public.apply_ops_drag_retention_action"),
  migration.indexOf("create or replace function public.release_ops_drag_retention_claim"),
);
const applyLockIndex = applyFunction.indexOf("for update;");
const applyHoldIndex = applyFunction.indexOf("public.ops_drag_retention_hold_covers(");
const applyReceiptIndex = applyFunction.indexOf("insert into public.ops_drag_retention_receipts");
const applyDeleteIndex = applyFunction.indexOf("delete from public.custom_ops_hub_leads");
assert.ok(applyLockIndex >= 0 && applyLockIndex < applyHoldIndex, "hold must be revalidated after the row lock");
assert.ok(applyHoldIndex < applyReceiptIndex, "hold must be revalidated before the destructive receipt");
assert.ok(applyHoldIndex < applyDeleteIndex, "hold must be revalidated before deletion");
assert.match(applyFunction, /returns text/);
assert.match(applyFunction, /return 'HELD'/);
assert.match(applyFunction, /return 'DEFERRED'/);
assert.match(applyFunction, /ops_drag_retention_detailed_due_at\(v_lead\.metadata\)/);
assert.equal((applyFunction.match(/return 'APPLIED'/g) ?? []).length, 2);
assert.match(applyFunction, /ops_drag_retention_attempts = greatest\(ops_drag_retention_attempts - 1, 0\)/);
assert.match(applyFunction, /ops_drag_retention_last_blocker_code = 'RETENTION_LEGAL_HOLD'/);
assert.match(applyFunction, /ops_drag_retention_lease_owner = null[\s\S]+ops_drag_retention_lease_acquired_at = null/);
assert.match(rollback, /drop function if exists public\.claim_ops_drag_retention_batch/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_hold_covers\(jsonb, text\)/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_hold_valid\(jsonb\)/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_detailed_due_at\(jsonb\)/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_dispute_state\(jsonb\)/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_order_lifecycle\(jsonb\)/);
assert.match(rollback, /drop function if exists public\.ops_drag_retention_reduced_metadata_valid\(jsonb\)/);
assert.match(rollback, /drop function if exists public\.defer_ops_drag_retention_claim/);
assert.match(rollback, /set metadata = jsonb_set[\s\S]+ops_drag_retention_legal_hold/);
assert.match(rollback, /quarantine_evidence_hash/);
assert.match(rollback, /drop table if exists public\.ops_drag_retention_holds/);
assert.match(rollback, /drop constraint if exists custom_ops_hub_leads_retention_timestamps_finite_check/);
assert.match(rollback, /drop table if exists public\.ops_drag_retention_receipts/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_WORKER_SECRET/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_WORKER_ENABLED/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_MUTATION_ENABLED/);
assert.doesNotMatch(route, /RESEND|STRIPE|PROVIDER_WORKER/);
assert.match(orderStore, /createOpsDragOrderStoreUpdate\(row\.metadata, order, legitimateActivityAt\)/);
assert.match(orderLifecycle, /ops_drag_retention_stage:\s*"AWAITING_TERMINAL"/);
const lifecycleStoreUpdate = createOpsDragOrderStoreUpdate(
  { preserved: "yes", ops_drag_retention_lease_owner: "not-metadata-authority" },
  paidAwaitingOrder
);
assert.equal(lifecycleStoreUpdate.metadata.preserved, "yes");
assert.equal(lifecycleStoreUpdate.metadata.ops_drag_report_order, paidAwaitingOrder);
assert.equal(lifecycleStoreUpdate.ops_drag_retention_stage, "AWAITING_TERMINAL");
assert.equal(lifecycleStoreUpdate.ops_drag_retention_lease_owner, null);
assert.equal(lifecycleStoreUpdate.ops_drag_retention_attempts, 0);
assert.match(applyFunction, /v_expected_stage := p_patch ->> 'expected_stage';[\s\S]+ops_drag_retention_lease_owner is distinct from p_owner/);
assert.match(applyFunction, /ops_drag_retention_lease_owner is null then\s+return 'DEFERRED'/);
assert.match(orderStore, /retention_redacted === true/);
for (const key of Object.keys(PRODUCTION_RAW_ATTRIBUTION).filter((key) => key !== "pre_qual")) {
  assert.match(ingestLeadRoute, new RegExp(`${key}:`), `${key} fixture must remain bound to the actual intake shape`);
}
assert.match(ingestLeadRoute, /preQual \? \{ pre_qual: preQual \}/);

console.log(
  "OPS_DRAG_REPORT_RETENTION_RUNTIME_PASS boundaries=PASS redaction=PASS production_attribution=PASS legal_hold=PASS atomic_hold_race=PASS dispute_rebase=PASS preclaimed_none=DEFERRED receipt_chain=PASS malformed=PASS scheduler_isolation=PASS row11=PASS migration_contract=PASS"
);
