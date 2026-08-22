import type { SupabaseClient } from "@supabase/supabase-js";

import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  type FulfillmentOwnershipResult,
  type OpsDragAdmittedSnapshot,
  type OpsDragOrder,
  type OpsDragPaymentAdmission,
} from "@/lib/ops-drag-report/order-foundation";
import {
  claimRefundAttempt,
  type RefundOwnershipResult,
} from "@/lib/ops-drag-report/delivery-refund-state-machine";
import { isOpsDragOrderWorkerEligibleDue } from "@/lib/ops-drag-report/worker-selection";

const ORDER_METADATA_KEY = "ops_drag_report_order";
const MAX_CAS_ATTEMPTS = 5;

type LeadMetadataRow = {
  id: string;
  metadata: Record<string, unknown>;
};

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOrder(metadata: Record<string, unknown>): OpsDragOrder | null {
  const value = metadata[ORDER_METADATA_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const order = value as Partial<OpsDragOrder>;
  if ((value as Record<string, unknown>).retention_redacted === true) {
    throw new Error("Stored Ops Drag Report order is retention-redacted and cannot re-enter fulfillment");
  }
  if (order.version !== "v1" || typeof order.order_id !== "string" || typeof order.submission_id !== "string") {
    throw new Error("Stored Ops Drag Report order is malformed");
  }
  return value as OpsDragOrder;
}

async function loadMetadataRow(supabase: SupabaseClient, submissionId: string): Promise<LeadMetadataRow> {
  const { data, error } = await supabase
    .from("custom_ops_hub_leads")
    .select("id, metadata")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) throw new Error(error.message || "Unable to load Ops Drag Report order metadata");
  if (!data || typeof data.id !== "string") throw new Error("Ops Check submission not found for order storage");
  return { id: data.id, metadata: readMetadata(data.metadata) };
}

async function compareAndSwapOrder(
  supabase: SupabaseClient,
  row: LeadMetadataRow,
  order: OpsDragOrder,
  legitimateActivityAt?: string
): Promise<boolean> {
  const nextMetadata = { ...row.metadata, [ORDER_METADATA_KEY]: order };
  const update = legitimateActivityAt
    ? { metadata: nextMetadata, ops_drag_last_legitimate_activity_at: legitimateActivityAt }
    : { metadata: nextMetadata };
  const { data, error } = await supabase
    .from("custom_ops_hub_leads")
    .update(update)
    .eq("id", row.id)
    .eq("metadata", row.metadata)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message || "Unable to atomically update Ops Drag Report order");
  return Boolean(data);
}

export async function admitOpsDragOrder(
  supabase: SupabaseClient,
  snapshot: OpsDragAdmittedSnapshot
): Promise<OpsDragOrder> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const row = await loadMetadataRow(supabase, snapshot.submission_id);
    const current = readOrder(row.metadata);
    if (current) {
      if (current.snapshot.digest !== snapshot.digest) {
        throw new Error("The admitted Ops Check snapshot is immutable and does not match this submission");
      }
      return current;
    }

    const order = createAdmittedOrder(snapshot);
    if (await compareAndSwapOrder(supabase, row, order, snapshot.admitted_at)) return order;
  }
  throw new Error("Ops Drag Report order admission lost its atomic update budget");
}

export async function loadOpsDragOrder(
  supabase: SupabaseClient,
  submissionId: string
): Promise<OpsDragOrder> {
  const row = await loadMetadataRow(supabase, submissionId);
  const order = readOrder(row.metadata);
  if (!order) throw new Error("Ops Drag Report order has not been admitted");
  return order;
}

export async function claimOpsDragFulfillment(
  supabase: SupabaseClient,
  submissionId: string,
  payment: OpsDragPaymentAdmission,
  recordedAt: string
): Promise<FulfillmentOwnershipResult> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const row = await loadMetadataRow(supabase, submissionId);
    const current = readOrder(row.metadata);
    if (!current) throw new Error("Ops Drag Report order has not been admitted");

    const transition = claimFulfillmentOwnership(current, payment, recordedAt);
    if (transition.order === current) return transition;
    if (await compareAndSwapOrder(supabase, row, transition.order)) return transition;
  }
  throw new Error("Ops Drag Report fulfillment lease lost its atomic update budget");
}

export async function transitionOpsDragOrder(
  supabase: SupabaseClient,
  submissionId: string,
  transition: (order: OpsDragOrder) => OpsDragOrder
): Promise<OpsDragOrder> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const row = await loadMetadataRow(supabase, submissionId);
    const current = readOrder(row.metadata);
    if (!current) throw new Error("Ops Drag Report order has not been admitted");

    const next = transition(structuredClone(current));
    if (next.order_id !== current.order_id || next.submission_id !== current.submission_id) {
      throw new Error("Ops Drag Report transition changed immutable order identity");
    }
    if (JSON.stringify(next) === JSON.stringify(current)) return current;
    if (await compareAndSwapOrder(supabase, row, next)) return next;
  }
  throw new Error("Ops Drag Report state transition lost its atomic update budget");
}

export async function listOpsDragOrdersForWorker(
  supabase: SupabaseClient,
  limit: number,
  recordedAt: string
): Promise<OpsDragOrder[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error("Worker order limit is invalid");
  if (!Number.isFinite(Date.parse(recordedAt))) throw new Error("Worker recordedAt is invalid");
  const { data, error } = await supabase.rpc("claim_ops_drag_report_worker_batch", {
    p_recorded_at: recordedAt,
    p_limit: limit,
  });
  if (error) throw new Error(error.message || "Unable to list Ops Drag Report worker orders");
  return ((data ?? []) as LeadMetadataRow[]).map((row) => {
    const order = readOrder(readMetadata(row.metadata));
    if (!order) throw new Error("Worker query returned a row without an Ops Drag Report order");
    return order;
  }).filter((order) => isOpsDragOrderWorkerEligibleDue(order, recordedAt)).slice(0, limit);
}

export async function claimOpsDragRefund(
  supabase: SupabaseClient,
  submissionId: string,
  recordedAt: string
): Promise<RefundOwnershipResult> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const row = await loadMetadataRow(supabase, submissionId);
    const current = readOrder(row.metadata);
    if (!current) throw new Error("Ops Drag Report order has not been admitted");
    const transition = claimRefundAttempt(current, recordedAt);
    if (transition.order === current) return transition;
    if (await compareAndSwapOrder(supabase, row, transition.order)) return transition;
  }
  throw new Error("Ops Drag Report refund lease lost its atomic update budget");
}
