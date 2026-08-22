import { canonicalJson, sha256, type JsonValue } from "./order-foundation.ts";

export const RETENTION_POLICY_VERSION = "ops_drag_retention_v1" as const;
export const RETENTION_WORKER_MAX_BATCH = 10 as const;
export const RETENTION_WORKER_MAX_ATTEMPTS = 3 as const;
export const REDUCED_TRANSACTION_ALLOWLIST = [
  "order_reference",
  "amount",
  "currency",
  "tax_config_reference",
  "terminal_disposition",
  "refund_dispute_status",
  "transaction_at",
  "terminal_at",
  "receipt_hash",
] as const;

export type RetentionDataClass =
  | "UNPAID_SUBMISSION"
  | "RAW_PAID_SUBMISSION"
  | "GENERATED_REPORT"
  | "EMAIL_ORDER_MAPPING"
  | "SUPPORT_TRANSCRIPT"
  | "RAW_ATTRIBUTION"
  | "ATTRIBUTION_AGGREGATE"
  | "DETAILED_RECEIPT_LEDGER"
  | "REDUCED_TRANSACTION_RECORD";

export type RetentionRecord = {
  record_id: string;
  data_class: RetentionDataClass;
  last_activity_at: string | null;
  terminal_at: string | null;
  support_closed_at: string | null;
  dispute_resolved_at: string | null;
  transaction_at: string | null;
  legal_hold: {
    id: string;
    released_at: string | null;
    data_classes?: Array<RetentionDataClass | "ALL">;
  } | null;
  lease: { owner: string; acquired_at: string; attempts: number } | null;
  previous_retention_receipt_hash?: string | null;
  payload: Record<string, JsonValue>;
};

export type RetentionAction =
  | { kind: "NONE"; due_at: string; reason: "RETENTION_WINDOW_ACTIVE" }
  | { kind: "HOLD"; due_at: string | null; reason: "SCOPED_LEGAL_HOLD" }
  | { kind: "DELETE"; due_at: string; reason: string }
  | { kind: "REDUCE"; due_at: string; reason: string; reduced: Record<string, JsonValue> };

export type RetentionReceipt = {
  policy_version: typeof RETENTION_POLICY_VERSION;
  record_id_hash: string;
  data_class: RetentionDataClass;
  action: "DELETE" | "REDUCE";
  due_at: string;
  applied_at: string;
  lease_owner_hash: string;
  attempt: number;
  evidence_hash: string;
  previous_receipt_hash: string | null;
  receipt_hash: string;
};

function timestamp(value: string | null, label: string): number {
  const parsed = Date.parse(value ?? "");
  if (!Number.isFinite(parsed)) throw new Error(`${label} is required`);
  return parsed;
}

function addDays(value: string | null, days: number, label: string): string {
  return new Date(timestamp(value, label) + days * 86_400_000).toISOString();
}

function addUtcMonths(value: string | null, months: number, label: string): string {
  const origin = new Date(timestamp(value, label));
  const targetMonth = origin.getUTCMonth() + months;
  const day = origin.getUTCDate();
  const target = new Date(Date.UTC(
    origin.getUTCFullYear(),
    targetMonth,
    1,
    origin.getUTCHours(),
    origin.getUTCMinutes(),
    origin.getUTCSeconds(),
    origin.getUTCMilliseconds()
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString();
}

function reducedRecordDeleteAt(transactionAt: string | null): string {
  const origin = new Date(timestamp(transactionAt, "transaction_at"));
  return new Date(Date.UTC(origin.getUTCFullYear() + 8, 0, 1)).toISOString();
}

function laterTimestamp(left: string | null, right: string | null): string {
  if (!left && !right) throw new Error("A terminal or dispute-resolution timestamp is required");
  if (!left) return right!;
  if (!right) return left;
  return timestamp(left, "left timestamp") >= timestamp(right, "right timestamp") ? left : right;
}

export function calculateRetentionDueAt(record: RetentionRecord): string {
  switch (record.data_class) {
    case "UNPAID_SUBMISSION":
      return addDays(record.last_activity_at, 7, "last_activity_at");
    case "RAW_PAID_SUBMISSION":
    case "GENERATED_REPORT":
      return addDays(record.terminal_at, 30, "terminal_at");
    case "EMAIL_ORDER_MAPPING":
    case "RAW_ATTRIBUTION":
      return addDays(record.terminal_at, 90, "terminal_at");
    case "SUPPORT_TRANSCRIPT":
      return addDays(record.support_closed_at, 90, "support_closed_at");
    case "ATTRIBUTION_AGGREGATE":
      return addUtcMonths(record.terminal_at, 24, "terminal_at");
    case "DETAILED_RECEIPT_LEDGER":
      return addUtcMonths(laterTimestamp(record.terminal_at, record.dispute_resolved_at), 24, "ledger origin");
    case "REDUCED_TRANSACTION_RECORD":
      return reducedRecordDeleteAt(record.transaction_at);
  }
}

export function reduceDetailedLedger(payload: Record<string, JsonValue>): Record<string, JsonValue> {
  const reduced: Record<string, JsonValue> = {};
  for (const key of REDUCED_TRANSACTION_ALLOWLIST) {
    if (payload[key] !== undefined) reduced[key] = payload[key];
  }
  return reduced;
}

export function planRetentionAction(record: RetentionRecord, now: string): RetentionAction {
  const dueAt = calculateRetentionDueAt(record);
  const holdClasses = record.legal_hold?.data_classes;
  const holdCoversClass = !holdClasses || holdClasses.length === 0 ||
    holdClasses.includes("ALL") || holdClasses.includes(record.data_class);
  if (record.legal_hold && !record.legal_hold.released_at && holdCoversClass) {
    return { kind: "HOLD", due_at: dueAt, reason: "SCOPED_LEGAL_HOLD" };
  }
  if (timestamp(now, "now") < timestamp(dueAt, "due_at")) {
    return { kind: "NONE", due_at: dueAt, reason: "RETENTION_WINDOW_ACTIVE" };
  }
  if (record.data_class === "DETAILED_RECEIPT_LEDGER") {
    return { kind: "REDUCE", due_at: dueAt, reason: "DETAILED_LEDGER_RETENTION_COMPLETE", reduced: reduceDetailedLedger(record.payload) };
  }
  return { kind: "DELETE", due_at: dueAt, reason: "RETENTION_WINDOW_COMPLETE" };
}

export type RetentionMutationAdapter = {
  apply(
    record: RetentionRecord,
    action: Extract<RetentionAction, { kind: "DELETE" | "REDUCE" }>,
    receipt: RetentionReceipt
  ): Promise<"APPLIED" | "HELD" | "DEFERRED">;
};

export function createRetentionMutationAdapter(input: {
  enabled: boolean;
  deleteRecord(record: RetentionRecord, receipt: RetentionReceipt): Promise<"APPLIED" | "HELD" | "DEFERRED" | void>;
  reduceRecord(
    record: RetentionRecord,
    reduced: Record<string, JsonValue>,
    receipt: RetentionReceipt
  ): Promise<"APPLIED" | "HELD" | "DEFERRED" | void>;
}): RetentionMutationAdapter {
  if (!input.enabled) throw new Error("Retention mutation adapter is disabled");
  return {
    async apply(record, action, receipt) {
      const disposition = action.kind === "DELETE"
        ? await input.deleteRecord(record, receipt)
        : await input.reduceRecord(record, action.reduced, receipt);
      return disposition === "HELD" || disposition === "DEFERRED" ? disposition : "APPLIED";
    },
  };
}

export type RetentionWorkerStore = {
  loadBatch(limit: number): Promise<RetentionRecord[]>;
  claim(recordId: string, owner: string, acquiredAt: string, staleBefore: string): Promise<RetentionRecord | null>;
  complete(recordId: string, receipt: RetentionReceipt): Promise<void>;
  defer(recordId: string, dueAt: string, reason: "RETENTION_WINDOW_ACTIVE" | "SCOPED_LEGAL_HOLD"): Promise<void>;
  release(recordId: string, blockerCode: string): Promise<void>;
};

function retentionReceipt(record: RetentionRecord, action: Extract<RetentionAction, { kind: "DELETE" | "REDUCE" }>, now: string): RetentionReceipt {
  if (!record.lease) throw new Error("Retention receipt requires an owned lease");
  const evidence = {
    policy_version: RETENTION_POLICY_VERSION,
    record_id_hash: sha256(record.record_id),
    data_class: record.data_class,
    action: action.kind,
    due_at: action.due_at,
    applied_at: now,
    lease_owner_hash: sha256(record.lease.owner),
    attempt: record.lease.attempts,
  };
  const evidenceHash = sha256(canonicalJson(evidence));
  const chained = {
    ...evidence,
    evidence_hash: evidenceHash,
    previous_receipt_hash: record.previous_retention_receipt_hash ?? null,
  };
  return { ...chained, receipt_hash: sha256(canonicalJson(chained)) };
}

export async function runRetentionCleanupWorker(input: {
  store: RetentionWorkerStore;
  adapter: RetentionMutationAdapter;
  owner: string;
  now: string;
  staleBefore: string;
  limit?: number;
}): Promise<{ scanned: number; applied: number; held: number; skipped: number; blocked: number }> {
  const limit = input.limit ?? RETENTION_WORKER_MAX_BATCH;
  if (!Number.isInteger(limit) || limit < 1 || limit > RETENTION_WORKER_MAX_BATCH) {
    throw new Error("Retention worker batch limit must be between 1 and 10");
  }
  const records = (await input.store.loadBatch(limit)).slice(0, limit);
  const result = { scanned: records.length, applied: 0, held: 0, skipped: 0, blocked: 0 };
  for (const observed of records) {
    const preclaimed = observed.lease?.owner === input.owner && observed.lease.acquired_at === input.now
      ? observed
      : null;
    let action: RetentionAction;
    try {
      action = planRetentionAction(observed, input.now);
    } catch {
      await input.store.release(observed.record_id, "RETENTION_TIMESTAMP_INVALID");
      result.blocked += 1;
      continue;
    }
    if (action.kind === "NONE") {
      if (preclaimed) await input.store.defer(observed.record_id, action.due_at, action.reason);
      result.skipped += 1;
      continue;
    }
    if (action.kind === "HOLD") {
      if (preclaimed) await input.store.defer(observed.record_id, action.due_at, action.reason);
      result.held += 1;
      continue;
    }
    const claimed = preclaimed ?? await input.store.claim(observed.record_id, input.owner, input.now, input.staleBefore);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }
    if (!claimed.lease || claimed.lease.attempts > RETENTION_WORKER_MAX_ATTEMPTS) {
      await input.store.release(observed.record_id, "RETENTION_RETRY_BUDGET_EXHAUSTED");
      result.blocked += 1;
      continue;
    }
    try {
      const claimedAction = planRetentionAction(claimed, input.now);
      if (claimedAction.kind !== "DELETE" && claimedAction.kind !== "REDUCE") {
        await input.store.defer(observed.record_id, claimedAction.due_at, claimedAction.reason);
        if (claimedAction.kind === "HOLD") result.held += 1;
        else result.skipped += 1;
        continue;
      }
      const receipt = retentionReceipt(claimed, claimedAction, input.now);
      const disposition = await input.adapter.apply(claimed, claimedAction, receipt);
      if (disposition === "HELD") {
        result.held += 1;
        continue;
      }
      if (disposition === "DEFERRED") {
        result.skipped += 1;
        continue;
      }
      await input.store.complete(claimed.record_id, receipt);
      result.applied += 1;
    } catch {
      await input.store.release(observed.record_id, "RETENTION_ADAPTER_FAILED");
      result.blocked += 1;
    }
  }
  return result;
}

export function retentionReceiptContainsRawPayload(receipt: RetentionReceipt, payload: Record<string, JsonValue>): boolean {
  const serialized = canonicalJson(receipt);
  return Object.values(payload).some((value) => typeof value === "string" && value.length > 0 && serialized.includes(value));
}

export function verifyRetentionReceiptChain(receipts: RetentionReceipt[]): boolean {
  let previous: string | null = null;
  for (const receipt of receipts) {
    if (receipt.previous_receipt_hash !== previous) return false;
    const { receipt_hash: receiptHash, ...chained } = receipt;
    if (sha256(canonicalJson(chained)) !== receiptHash) return false;
    const {
      evidence_hash: evidenceHash,
      previous_receipt_hash: _previousReceiptHash,
      ...evidence
    } = chained;
    if (sha256(canonicalJson(evidence)) !== evidenceHash) return false;
    previous = receiptHash;
  }
  return true;
}
