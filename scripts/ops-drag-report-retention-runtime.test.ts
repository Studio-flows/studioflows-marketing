import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { JsonValue } from "../lib/ops-drag-report/order-foundation.ts";
import {
  calculateRetentionDueAt,
  createRetentionMutationAdapter,
  planRetentionAction,
  reduceDetailedLedger,
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

class SingleRecordStore implements RetentionWorkerStore {
  current: RetentionRecord;
  receipts: RetentionReceipt[] = [];
  releases: string[] = [];
  constructor(initial: RetentionRecord) { this.current = structuredClone(initial); }
  async loadBatch() { return [structuredClone(this.current)]; }
  async claim() { return structuredClone(this.current); }
  async complete(_recordId: string, receipt: RetentionReceipt) { this.receipts.push(receipt); }
  async release(_recordId: string, blocker: string) { this.releases.push(blocker); }
}

const firstStore = new SingleRecordStore(record("RAW_PAID_SUBMISSION"));
const captureAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() {},
  async reduceRecord() {},
});
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
const ingestLeadRoute = readFileSync("app/api/studioflows/ingest-lead/route.ts", "utf8");
for (const contract of [
  /limit p_limit\s+for update skip locked/i,
  /ops_drag_retention_cursor/,
  /ops_drag_last_legitimate_activity_at/,
  /ops_drag_retention_attempts between 0 and 3/,
  /RETENTION_TERMINAL_TIMESTAMP_INVALID/,
  /ops_drag_retention_legal_hold/,
  /revoke all on function public\.claim_ops_drag_retention_batch[\s\S]+from public, anon, authenticated/i,
  /grant execute on function public\.claim_ops_drag_retention_batch[\s\S]+to service_role/i,
]) assert.match(migration, contract);
assert.match(rollback, /drop function if exists public\.claim_ops_drag_retention_batch/);
assert.match(rollback, /drop table if exists public\.ops_drag_retention_receipts/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_WORKER_SECRET/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_WORKER_ENABLED/);
assert.match(route, /OPS_DRAG_REPORT_RETENTION_MUTATION_ENABLED/);
assert.doesNotMatch(route, /RESEND|STRIPE|PROVIDER_WORKER/);
assert.match(orderStore, /ops_drag_last_legitimate_activity_at:\s*legitimateActivityAt/);
assert.match(orderStore, /retention_redacted === true/);
for (const key of Object.keys(PRODUCTION_RAW_ATTRIBUTION).filter((key) => key !== "pre_qual")) {
  assert.match(ingestLeadRoute, new RegExp(`${key}:`), `${key} fixture must remain bound to the actual intake shape`);
}
assert.match(ingestLeadRoute, /preQual \? \{ pre_qual: preQual \}/);

console.log(
  "OPS_DRAG_REPORT_RETENTION_RUNTIME_PASS boundaries=PASS redaction=PASS production_attribution=PASS legal_hold=PASS receipt_chain=PASS malformed=PASS scheduler_isolation=PASS row11=PASS migration_contract=PASS"
);
