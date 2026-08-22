import type { OpsDragOrder } from "./order-foundation.ts";

export type OpsDragRetentionLifecycleUpdate = {
  ops_drag_last_legitimate_activity_at?: string;
  ops_drag_retention_stage: "UNPAID_SUBMISSION" | "AWAITING_TERMINAL" | "RAW_PAID_SUBMISSION";
  ops_drag_retention_due_at: string | null;
  ops_drag_retention_lease_owner: null;
  ops_drag_retention_lease_acquired_at: null;
  ops_drag_retention_attempts: 0;
  ops_drag_retention_last_blocker_code: null;
};

export const OPS_DRAG_ORDER_METADATA_KEY = "ops_drag_report_order";

export type OpsDragOrderStoreUpdate = OpsDragRetentionLifecycleUpdate & {
  metadata: Record<string, unknown>;
};

function plusDays(value: string, days: number): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Ops Drag Report retention lifecycle timestamp is invalid");
  return new Date(parsed + days * 86_400_000).toISOString();
}

export function createOpsDragRetentionLifecycleUpdate(
  order: OpsDragOrder,
  legitimateActivityAt?: string
): OpsDragRetentionLifecycleUpdate {
  const terminalAt = [...order.receipts]
    .reverse()
    .find((receipt) => receipt.kind === "ORDER_TERMINAL")?.recorded_at;
  const common = {
    ops_drag_retention_lease_owner: null,
    ops_drag_retention_lease_acquired_at: null,
    ops_drag_retention_attempts: 0 as const,
    ops_drag_retention_last_blocker_code: null,
  };
  if (order.payment) {
    if (order.automation?.terminal_disposition) {
      if (!terminalAt) throw new Error("Terminal Ops Drag Report order has no terminal receipt timestamp");
      return {
        ...common,
        ops_drag_retention_stage: "RAW_PAID_SUBMISSION",
        ops_drag_retention_due_at: plusDays(terminalAt, 30),
      };
    }
    return {
      ...common,
      ops_drag_retention_stage: "AWAITING_TERMINAL",
      ops_drag_retention_due_at: null,
    };
  }
  const activityAt = legitimateActivityAt ?? order.snapshot.admitted_at;
  return {
    ...common,
    ops_drag_last_legitimate_activity_at: activityAt,
    ops_drag_retention_stage: "UNPAID_SUBMISSION",
    ops_drag_retention_due_at: plusDays(activityAt, 7),
  };
}

export function createOpsDragOrderStoreUpdate(
  currentMetadata: Record<string, unknown>,
  order: OpsDragOrder,
  legitimateActivityAt?: string
): OpsDragOrderStoreUpdate {
  return {
    metadata: { ...currentMetadata, [OPS_DRAG_ORDER_METADATA_KEY]: order },
    ...createOpsDragRetentionLifecycleUpdate(order, legitimateActivityAt),
  };
}
