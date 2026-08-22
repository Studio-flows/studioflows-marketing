import { randomUUID, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JsonValue } from "./order-foundation.ts";
import {
  calculateRetentionDueAt,
  createRetentionMutationAdapter,
  runRetentionCleanupWorker,
  type RetentionDataClass,
  type RetentionRecord,
  type RetentionReceipt,
  type RetentionWorkerStore,
} from "./retention-controller.ts";

export const RETENTION_REDACTED_TEXT = "[REDACTED]" as const;
export const RETENTION_REDACTED_EMAIL = "redacted@retained.invalid" as const;
export const RETENTION_LEASE_STALE_MINUTES = 15 as const;

const RUNTIME_ROW_KEY = "runtime_row";
const RAW_ATTRIBUTION_METADATA_KEYS = [
  "src",
  "pq_session_id",
  "pq_score",
  "pq_qualified",
  "pq_band",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "referrer",
  "landing_path",
  "pre_qual",
] as const;
const DATA_CLASSES = new Set<RetentionDataClass>([
  "UNPAID_SUBMISSION",
  "RAW_PAID_SUBMISSION",
  "GENERATED_REPORT",
  "EMAIL_ORDER_MAPPING",
  "SUPPORT_TRANSCRIPT",
  "RAW_ATTRIBUTION",
  "ATTRIBUTION_AGGREGATE",
  "DETAILED_RECEIPT_LEDGER",
  "REDUCED_TRANSACTION_RECORD",
]);

type RuntimeRow = {
  id: string;
  full_name: string;
  work_email: string;
  company_name: string;
  company_website: string | null;
  business_model: string;
  company_stage: string;
  primary_pain_area: string;
  highest_cost_bottleneck: string;
  highest_cost_bottleneck_other: string | null;
  workflow_management: JsonValue[];
  frequent_breakdown: string;
  frequent_breakdown_detail: string;
  urgency_window: string;
  quarter_risk: string;
  implementation_ownership: string;
  budget_range: string;
  approval_involvement: string;
  raw_answers: Record<string, JsonValue>;
  metadata: Record<string, JsonValue>;
};

export type RetentionRuntimePatch = {
  expected_stage: RetentionDataClass;
  next_stage: RetentionDataClass | "COMPLETE";
  next_due_at: string | null;
  delete_row: boolean;
  columns: Record<string, JsonValue>;
};

type ClaimRow = {
  record_id: unknown;
  data_class: unknown;
  last_activity_at: unknown;
  terminal_at: unknown;
  support_closed_at: unknown;
  dispute_resolved_at: unknown;
  transaction_at: unknown;
  legal_hold: unknown;
  lease_owner: unknown;
  lease_acquired_at: unknown;
  lease_attempts: unknown;
  previous_receipt_hash: unknown;
  payload: unknown;
};

function objectValue(value: unknown, label: string): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return structuredClone(value as Record<string, JsonValue>);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function requireTimestamp(value: string | null, label: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error(`${label} is required`);
  return value;
}

function runtimeRow(record: RetentionRecord): RuntimeRow {
  const value = record.payload[RUNTIME_ROW_KEY];
  const row = objectValue(value, "Retention runtime row") as unknown as RuntimeRow;
  if (typeof row.id !== "string" || row.id !== record.record_id) throw new Error("Retention runtime row identity mismatch");
  row.metadata = objectValue(row.metadata, "Retention metadata");
  row.raw_answers = objectValue(row.raw_answers, "Retention raw answers");
  return row;
}

function orderMetadata(metadata: Record<string, JsonValue>): Record<string, JsonValue> {
  return objectValue(metadata.ops_drag_report_order, "Ops Drag Report order metadata");
}

function withRuntimeRow(payload: Record<string, JsonValue>, row: RuntimeRow): Record<string, JsonValue> {
  return { ...payload, [RUNTIME_ROW_KEY]: row as unknown as JsonValue };
}

function detailedLedgerDueAt(record: RetentionRecord): string {
  return calculateRetentionDueAt({ ...record, data_class: "DETAILED_RECEIPT_LEDGER" });
}

function stripSupport(metadata: Record<string, JsonValue>): void {
  delete metadata.ops_drag_support_transcript;
  delete metadata.ops_drag_report_support;
  delete metadata.support_transcript;
}

function stripRawAttribution(metadata: Record<string, JsonValue>): void {
  delete metadata.ops_drag_raw_attribution;
  delete metadata.raw_attribution;
  for (const key of RAW_ATTRIBUTION_METADATA_KEYS) delete metadata[key];
}

function redactRawPaid(record: RetentionRecord): RetentionRuntimePatch {
  const row = runtimeRow(record);
  const metadata = structuredClone(row.metadata);
  const order = orderMetadata(metadata);
  const snapshot = objectValue(order.snapshot, "Retained order snapshot");
  const automation = objectValue(order.automation, "Retained order automation");
  const generation = objectValue(automation.generation, "Retained generation state");

  snapshot.report_input = {
    leadId: RETENTION_REDACTED_TEXT,
    quizPayload: {},
    preQual: null,
    qualificationScore: null,
  };
  generation.artifact = null;
  automation.generation = generation;
  order.snapshot = snapshot;
  order.automation = automation;
  order.retention_redacted = true;
  metadata.ops_drag_report_order = order;
  delete metadata.ops_drag_report_input;
  delete metadata.ops_drag_report_generated_report;

  return {
    expected_stage: record.data_class,
    next_stage: "EMAIL_ORDER_MAPPING",
    next_due_at: calculateRetentionDueAt({ ...record, data_class: "EMAIL_ORDER_MAPPING" }),
    delete_row: false,
    columns: {
      full_name: RETENTION_REDACTED_TEXT,
      company_name: RETENTION_REDACTED_TEXT,
      company_website: null,
      business_model: RETENTION_REDACTED_TEXT,
      company_stage: RETENTION_REDACTED_TEXT,
      primary_pain_area: RETENTION_REDACTED_TEXT,
      highest_cost_bottleneck: RETENTION_REDACTED_TEXT,
      highest_cost_bottleneck_other: null,
      workflow_management: [],
      frequent_breakdown: RETENTION_REDACTED_TEXT,
      frequent_breakdown_detail: RETENTION_REDACTED_TEXT,
      urgency_window: RETENTION_REDACTED_TEXT,
      quarter_risk: RETENTION_REDACTED_TEXT,
      implementation_ownership: RETENTION_REDACTED_TEXT,
      budget_range: RETENTION_REDACTED_TEXT,
      approval_involvement: RETENTION_REDACTED_TEXT,
      raw_answers: {},
      metadata,
    },
  };
}

function redactMapping(record: RetentionRecord): RetentionRuntimePatch {
  const row = runtimeRow(record);
  const metadata = structuredClone(row.metadata);
  const order = orderMetadata(metadata);
  const snapshot = objectValue(order.snapshot, "Retained order snapshot");
  const payment = objectValue(order.payment, "Retained order payment");
  snapshot.delivery_email = RETENTION_REDACTED_EMAIL;
  payment.customerEmailSha256 = null;
  order.snapshot = snapshot;
  order.payment = payment;
  order.retention_mapping_redacted = true;
  metadata.ops_drag_report_order = order;
  delete metadata.ops_drag_email_order_mapping;
  stripRawAttribution(metadata);

  const hasSupport = "ops_drag_support_transcript" in metadata ||
    "ops_drag_report_support" in metadata ||
    "support_transcript" in metadata;
  let nextStage: RetentionDataClass = "DETAILED_RECEIPT_LEDGER";
  let nextDueAt = detailedLedgerDueAt(record);
  if (hasSupport) {
    if (record.support_closed_at) {
      const supportDue = calculateRetentionDueAt({ ...record, data_class: "SUPPORT_TRANSCRIPT" });
      const mappingDue = calculateRetentionDueAt({
        ...record,
        data_class: "EMAIL_ORDER_MAPPING",
      });
      if (Date.parse(supportDue) <= Date.parse(mappingDue)) {
        stripSupport(metadata);
      } else {
        nextStage = "SUPPORT_TRANSCRIPT";
        nextDueAt = supportDue;
      }
    } else {
      nextStage = "SUPPORT_TRANSCRIPT";
      nextDueAt = null;
    }
  }

  return {
    expected_stage: "EMAIL_ORDER_MAPPING",
    next_stage: nextStage,
    next_due_at: nextDueAt,
    delete_row: false,
    columns: { work_email: RETENTION_REDACTED_EMAIL, metadata },
  };
}

function redactSupport(record: RetentionRecord): RetentionRuntimePatch {
  const row = runtimeRow(record);
  const metadata = structuredClone(row.metadata);
  stripSupport(metadata);
  return {
    expected_stage: "SUPPORT_TRANSCRIPT",
    next_stage: "DETAILED_RECEIPT_LEDGER",
    next_due_at: detailedLedgerDueAt(record),
    delete_row: false,
    columns: { metadata },
  };
}

function reduceLedger(record: RetentionRecord, reduced: Record<string, JsonValue>): RetentionRuntimePatch {
  if (typeof reduced.order_reference !== "string" || !/^[0-9a-f]{64}$/.test(reduced.order_reference)) {
    throw new Error("Reduced transaction record requires a hashed order reference");
  }
  if (!Number.isInteger(reduced.amount) || Number(reduced.amount) < 0) {
    throw new Error("Reduced transaction record requires a non-negative integer amount");
  }
  if (typeof reduced.currency !== "string" || !/^[a-z]{3}$/.test(reduced.currency)) {
    throw new Error("Reduced transaction record requires a lowercase ISO currency");
  }
  requireTimestamp(typeof reduced.transaction_at === "string" ? reduced.transaction_at : null, "transaction_at");
  requireTimestamp(typeof reduced.terminal_at === "string" ? reduced.terminal_at : null, "terminal_at");
  if (typeof reduced.receipt_hash !== "string" || !/^[0-9a-f]{64}$/.test(reduced.receipt_hash)) {
    throw new Error("Reduced transaction record requires the terminal receipt hash");
  }
  const row = runtimeRow(record);
  const metadata = structuredClone(row.metadata);
  delete metadata.ops_drag_report_order;
  delete metadata.ops_drag_email_order_mapping;
  stripRawAttribution(metadata);
  stripSupport(metadata);
  metadata.ops_drag_reduced_transaction_record = structuredClone(reduced);
  const transactionAt = typeof reduced.transaction_at === "string" ? reduced.transaction_at : record.transaction_at;
  const finalDueAt = calculateRetentionDueAt({
    ...record,
    data_class: "REDUCED_TRANSACTION_RECORD",
    transaction_at: transactionAt,
  });
  return {
    expected_stage: "DETAILED_RECEIPT_LEDGER",
    next_stage: "REDUCED_TRANSACTION_RECORD",
    next_due_at: finalDueAt,
    delete_row: false,
    columns: { metadata },
  };
}

export function createRetentionRuntimePatch(
  record: RetentionRecord,
  action: "DELETE" | "REDUCE",
  reduced: Record<string, JsonValue> = {}
): RetentionRuntimePatch {
  if (action === "REDUCE") {
    if (record.data_class !== "DETAILED_RECEIPT_LEDGER") throw new Error("Only the detailed ledger may be reduced");
    return reduceLedger(record, reduced);
  }
  if (record.data_class === "UNPAID_SUBMISSION" || record.data_class === "REDUCED_TRANSACTION_RECORD") {
    return {
      expected_stage: record.data_class,
      next_stage: "COMPLETE",
      next_due_at: null,
      delete_row: true,
      columns: {},
    };
  }
  if (record.data_class === "RAW_PAID_SUBMISSION" || record.data_class === "GENERATED_REPORT") {
    return redactRawPaid(record);
  }
  if (record.data_class === "EMAIL_ORDER_MAPPING") return redactMapping(record);
  if (record.data_class === "SUPPORT_TRANSCRIPT") return redactSupport(record);
  throw new Error(`Retention data class ${record.data_class} has no runtime transformation`);
}

function mapClaimRow(value: ClaimRow): RetentionRecord {
  const recordId = typeof value.record_id === "string" ? value.record_id : "";
  const dataClass = typeof value.data_class === "string" && DATA_CLASSES.has(value.data_class as RetentionDataClass)
    ? value.data_class as RetentionDataClass
    : null;
  if (!recordId || !dataClass) throw new Error("Retention claim row is malformed");
  const owner = nullableString(value.lease_owner);
  const acquiredAt = nullableString(value.lease_acquired_at);
  const attempts = typeof value.lease_attempts === "number" ? value.lease_attempts : Number(value.lease_attempts);
  if (!owner || !acquiredAt || !Number.isInteger(attempts)) throw new Error("Retention claim lease is malformed");
  const legalHoldValue = value.legal_hold;
  const legalHoldObject = legalHoldValue && typeof legalHoldValue === "object" && !Array.isArray(legalHoldValue)
    ? legalHoldValue as Record<string, unknown>
    : null;
  const holdClasses = Array.isArray(legalHoldObject?.data_classes)
    ? legalHoldObject.data_classes.filter((entry): entry is RetentionDataClass | "ALL" =>
      entry === "ALL" || (typeof entry === "string" && DATA_CLASSES.has(entry as RetentionDataClass)))
    : undefined;
  return {
    record_id: recordId,
    data_class: dataClass,
    last_activity_at: nullableString(value.last_activity_at),
    terminal_at: nullableString(value.terminal_at),
    support_closed_at: nullableString(value.support_closed_at),
    dispute_resolved_at: nullableString(value.dispute_resolved_at),
    transaction_at: nullableString(value.transaction_at),
    legal_hold: legalHoldObject && typeof legalHoldObject.id === "string"
      ? {
        id: legalHoldObject.id,
        released_at: nullableString(legalHoldObject.released_at),
        data_classes: holdClasses,
      }
      : null,
    lease: { owner, acquired_at: acquiredAt, attempts },
    previous_retention_receipt_hash: nullableString(value.previous_receipt_hash),
    payload: objectValue(value.payload, "Retention claim payload"),
  };
}

export function assertRetentionSchedulerRequest(input: {
  authorization: string | null;
  expectedSecret: string | undefined;
  enabled: string | undefined;
  mutationEnabled: string | undefined;
}): void {
  if (input.enabled !== "true" || input.mutationEnabled !== "true") {
    throw new Error("Ops Drag Report retention worker is disabled");
  }
  const secret = input.expectedSecret?.trim() ?? "";
  if (secret.length < 32) throw new Error("Ops Drag Report retention worker secret is not configured");
  const supplied = input.authorization?.startsWith("Bearer ") ? input.authorization.slice(7) : "";
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    throw new Error("Ops Drag Report retention scheduler authorization failed");
  }
}

export function retentionStaleBefore(now: string): string {
  const parsed = Date.parse(requireTimestamp(now, "Retention now"));
  return new Date(parsed - RETENTION_LEASE_STALE_MINUTES * 60_000).toISOString();
}

export function createSupabaseRetentionRuntime(input: {
  supabase: SupabaseClient;
  owner: string;
  now: string;
  staleBefore: string;
  enabled: boolean;
}): { store: RetentionWorkerStore; adapter: ReturnType<typeof createRetentionMutationAdapter> } {
  const completeAction = async (
    record: RetentionRecord,
    receipt: RetentionReceipt,
    action: "DELETE" | "REDUCE",
    reduced: Record<string, JsonValue> = {}
  ): Promise<"APPLIED" | "HELD" | "DEFERRED"> => {
    const patch = createRetentionRuntimePatch(record, action, reduced);
    const { data, error } = await input.supabase.rpc("apply_ops_drag_retention_action", {
      p_record_id: record.record_id,
      p_owner: input.owner,
      p_patch: patch,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message || "Unable to apply Ops Drag Report retention action");
    if (data !== "APPLIED" && data !== "HELD" && data !== "DEFERRED") {
      throw new Error("Ops Drag Report retention action returned an invalid disposition");
    }
    return data;
  };

  const store: RetentionWorkerStore = {
    async loadBatch(limit) {
      const { data, error } = await input.supabase.rpc("claim_ops_drag_retention_batch", {
        p_recorded_at: input.now,
        p_owner: input.owner,
        p_stale_before: input.staleBefore,
        p_limit: limit,
      });
      if (error) throw new Error(error.message || "Unable to claim Ops Drag Report retention records");
      return ((data ?? []) as ClaimRow[]).map(mapClaimRow);
    },
    async claim() {
      return null;
    },
    async complete() {
      return;
    },
    async defer(recordId, dueAt, reason) {
      const { data, error } = await input.supabase.rpc("defer_ops_drag_retention_claim", {
        p_record_id: recordId,
        p_owner: input.owner,
        p_due_at: dueAt,
        p_reason: reason,
      });
      if (error) throw new Error(error.message || "Unable to defer Ops Drag Report retention claim");
      if (data !== "DEFERRED") throw new Error("Ops Drag Report retention defer returned an invalid disposition");
    },
    async release(recordId, blockerCode) {
      const { error } = await input.supabase.rpc("release_ops_drag_retention_claim", {
        p_record_id: recordId,
        p_owner: input.owner,
        p_blocker_code: blockerCode,
        p_recorded_at: input.now,
      });
      if (error) throw new Error(error.message || "Unable to release Ops Drag Report retention claim");
    },
  };

  const adapter = createRetentionMutationAdapter({
    enabled: input.enabled,
    deleteRecord: (record, receipt) => completeAction(record, receipt, "DELETE"),
    reduceRecord: (record, reduced, receipt) => completeAction(record, receipt, "REDUCE", reduced),
  });
  return { store, adapter };
}

export async function runSupabaseRetentionCleanup(input: {
  supabase: SupabaseClient;
  now: string;
  owner?: string;
}): Promise<{ scanned: number; applied: number; held: number; skipped: number; blocked: number }> {
  const owner = input.owner ?? `retention-${randomUUID()}`;
  const staleBefore = retentionStaleBefore(input.now);
  const runtime = createSupabaseRetentionRuntime({
    supabase: input.supabase,
    owner,
    now: input.now,
    staleBefore,
    enabled: true,
  });
  return runRetentionCleanupWorker({ ...runtime, owner, now: input.now, staleBefore });
}
