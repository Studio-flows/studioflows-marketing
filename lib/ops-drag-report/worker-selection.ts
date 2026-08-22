import type { OpsDragOrder } from "./order-foundation.ts";

export type WorkerSelectionRow = {
  cursorId: string;
  order: OpsDragOrder;
};

function refundEligibleAt(order: OpsDragOrder): string {
  if (order.automation) return order.automation.sla.refund_eligible_at;
  return new Date(Date.parse(order.payment!.paidAt) + 45 * 60_000).toISOString();
}

export function isOpsDragOrderWorkerEligibleDue(order: OpsDragOrder, recordedAt: string): boolean {
  if (!order.payment || order.automation?.terminal_disposition) return false;
  const automation = order.automation;
  if (!automation) return true;
  if (automation.refund.status === "REQUIRED" || automation.refund.status === "RETRYABLE") return true;
  if (automation.refund.status !== "NOT_REQUIRED") return false;
  if (["PENDING", "IN_PROGRESS", "RETRYABLE"].includes(automation.generation.status)) return true;
  if (automation.generation.status !== "VALIDATED") return false;
  if (["PENDING", "RETRYABLE"].includes(automation.delivery.status)) return true;
  if (automation.delivery.status === "SUBMITTING") {
    const unknownCount = automation.delivery.submission_outcome_unknown_count ?? 0;
    const maxUnknown = automation.delivery.max_submission_outcome_unknown_count ?? 3;
    return unknownCount < maxUnknown || Date.parse(recordedAt) >= Date.parse(refundEligibleAt(order));
  }
  if (["SUBMITTED", "ACCEPTED", "QUEUED", "SENT"].includes(automation.delivery.status)) {
    return Date.parse(recordedAt) >= Date.parse(refundEligibleAt(order));
  }
  return false;
}

export function selectBoundedWorkerPage(input: {
  rows: WorkerSelectionRow[];
  afterCursor: string | null;
  recordedAt: string;
  limit: number;
}): { orders: OpsDragOrder[]; nextCursor: string | null; scanned: number } {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10) {
    throw new Error("Worker selection limit must be between 1 and 10");
  }
  const rows = [...input.rows].sort((left, right) => left.cursorId.localeCompare(right.cursorId));
  const after = input.afterCursor;
  let page = rows.filter((row) => after === null || row.cursorId > after).slice(0, input.limit);
  if (page.length === 0 && rows.length > 0) page = rows.slice(0, input.limit);
  return {
    orders: page
      .filter((row) => isOpsDragOrderWorkerEligibleDue(row.order, input.recordedAt))
      .map((row) => row.order),
    nextCursor: page.at(-1)?.cursorId ?? null,
    scanned: page.length,
  };
}
