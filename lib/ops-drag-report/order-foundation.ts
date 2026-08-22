import { createHash } from "node:crypto";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type OpsDragReportInput = {
  leadId: string;
  quizPayload: { [key: string]: JsonValue };
  preQual: { [key: string]: JsonValue } | null;
  qualificationScore: number | null;
};

export type OpsDragAdmittedSnapshot = {
  version: "v1";
  submission_id: string;
  admitted_at: string;
  delivery_email: string;
  report_input: OpsDragReportInput;
  digest: string;
};

export type OpsDragReceiptKind =
  | "SUBMISSION_ADMITTED"
  | "PAYMENT_ADMITTED_FULFILLMENT_OWNED"
  | "DUPLICATE_PAYMENT_EVENT_NOOP";

export type OpsDragChainedReceipt = {
  version: "v1";
  sequence: number;
  kind: OpsDragReceiptKind;
  order_id: string;
  submission_id: string;
  recorded_at: string;
  evidence: { [key: string]: JsonValue };
  previous_receipt_hash: string | null;
  receipt_hash: string;
};

export type OpsDragPaymentAdmission = {
  checkoutSessionId: string;
  paymentReferenceId: string;
  webhookEventId: string;
  paidAt: string;
  amountTotal: number;
  currency: "usd";
  customerEmailSha256: string;
  snapshotDigest: string;
};

export type OpsDragOrder = {
  version: "v1";
  order_id: string;
  submission_id: string;
  workflow_status: "READY" | "IN_PROGRESS";
  snapshot: OpsDragAdmittedSnapshot;
  payment: OpsDragPaymentAdmission | null;
  fulfillment: {
    lease_owner: string | null;
    lease_acquired_at: string | null;
  };
  processed_event_ids: string[];
  receipts: OpsDragChainedReceipt[];
};

export type FulfillmentOwnershipResult =
  | { disposition: "acquired"; order: OpsDragOrder; leaseOwner: string }
  | { disposition: "duplicate"; order: OpsDragOrder; leaseOwner: string };

const SNAPSHOT_FIELDS = [
  ["fullName", "full_name"],
  ["workEmail", "work_email"],
  ["companyName", "company_name"],
  ["companyWebsite", "company_website"],
  ["businessModel", "business_model"],
  ["companyStage", "company_stage"],
  ["primaryPainArea", "primary_pain_area"],
  ["highestCostBottleneck", "highest_cost_bottleneck"],
  ["highestCostBottleneckOther", "highest_cost_bottleneck_other"],
  ["workflowManagement", "workflow_management"],
  ["frequentBreakdown", "frequent_breakdown"],
  ["frequentBreakdownDetail", "frequent_breakdown_detail"],
  ["urgencyWindow", "urgency_window"],
  ["quarterRisk", "quarter_risk"],
  ["implementationOwnership", "implementation_ownership"],
  ["budgetRange", "budget_range"],
  ["approvalInvolvement", "approval_involvement"],
] as const;

function normalizeJson(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Order snapshots cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (typeof value === "object") {
    const output: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) output[key] = normalizeJson(child);
    }
    return output;
  }
  throw new Error("Order snapshots must contain JSON values only");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readEmail(row: Record<string, unknown>): string {
  const email = typeof row.work_email === "string" ? row.work_email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid admitted report delivery email is required");
  }
  return email;
}

function buildReportInput(row: Record<string, unknown>, submissionId: string): OpsDragReportInput {
  const rawAnswers = readObject(row.raw_answers);
  const metadata = readObject(row.metadata);
  const quizPayload: { [key: string]: JsonValue } = {};

  for (const [outputKey, rowKey] of SNAPSHOT_FIELDS) {
    const value = row[rowKey] ?? rawAnswers[outputKey] ?? null;
    quizPayload[outputKey] = normalizeJson(value);
  }

  const preQualValue = metadata.pre_qual;
  const preQual = preQualValue && typeof preQualValue === "object" && !Array.isArray(preQualValue)
    ? (normalizeJson(preQualValue) as { [key: string]: JsonValue })
    : null;
  const qualificationScore =
    typeof metadata.qualification_score === "number" && Number.isFinite(metadata.qualification_score)
      ? metadata.qualification_score
      : null;

  return { leadId: submissionId, quizPayload, preQual, qualificationScore };
}

export function createAdmittedSnapshot(
  row: Record<string, unknown>,
  submissionId: string,
  admittedAt: string
): OpsDragAdmittedSnapshot {
  const deliveryEmail = readEmail(row);
  const reportInput = buildReportInput(row, submissionId);
  const digest = sha256(canonicalJson({
    version: "v1",
    submission_id: submissionId,
    delivery_email: deliveryEmail,
    report_input: reportInput,
  }));

  return {
    version: "v1",
    submission_id: submissionId,
    admitted_at: admittedAt,
    delivery_email: deliveryEmail,
    report_input: reportInput,
    digest,
  };
}

function createOrderId(snapshot: OpsDragAdmittedSnapshot): string {
  return `odr_${sha256(`${snapshot.submission_id}|${snapshot.digest}|v1`).slice(0, 32)}`;
}

function appendReceipt(
  order: Omit<OpsDragOrder, "receipts"> & { receipts: OpsDragChainedReceipt[] },
  kind: OpsDragReceiptKind,
  recordedAt: string,
  evidence: { [key: string]: JsonValue }
): OpsDragChainedReceipt[] {
  const previous = order.receipts.at(-1)?.receipt_hash ?? null;
  const unsigned = {
    version: "v1" as const,
    sequence: order.receipts.length + 1,
    kind,
    order_id: order.order_id,
    submission_id: order.submission_id,
    recorded_at: recordedAt,
    evidence,
    previous_receipt_hash: previous,
  };
  const receipt: OpsDragChainedReceipt = {
    ...unsigned,
    receipt_hash: sha256(canonicalJson(unsigned)),
  };
  return [...order.receipts, receipt];
}

export function createAdmittedOrder(snapshot: OpsDragAdmittedSnapshot): OpsDragOrder {
  const base: OpsDragOrder = {
    version: "v1",
    order_id: createOrderId(snapshot),
    submission_id: snapshot.submission_id,
    workflow_status: "READY",
    snapshot,
    payment: null,
    fulfillment: { lease_owner: null, lease_acquired_at: null },
    processed_event_ids: [],
    receipts: [],
  };
  return {
    ...base,
    receipts: appendReceipt(base, "SUBMISSION_ADMITTED", snapshot.admitted_at, {
      snapshot_digest: snapshot.digest,
      delivery_email_sha256: sha256(snapshot.delivery_email),
      report_schema_version: "v1",
    }),
  };
}

function assertTransition(from: OpsDragOrder["workflow_status"], to: OpsDragOrder["workflow_status"]): void {
  if (from === "READY" && to === "IN_PROGRESS") return;
  if (from === "IN_PROGRESS" && to === "IN_PROGRESS") return;
  throw new Error(`Order transition ${from}->${to} is not allowed in the foundation gate`);
}

function createLeaseOwner(payment: OpsDragPaymentAdmission): string {
  return `ful_${sha256(`${payment.checkoutSessionId}|${payment.webhookEventId}|v1`).slice(0, 32)}`;
}

function assertPaymentMatchesOrder(order: OpsDragOrder, payment: OpsDragPaymentAdmission): void {
  if (payment.snapshotDigest !== order.snapshot.digest) throw new Error("Payment snapshot digest mismatch");
  if (payment.amountTotal !== 2_900 || payment.currency !== "usd") {
    throw new Error("Payment offer binding mismatch");
  }
  if (order.payment && order.payment.checkoutSessionId !== payment.checkoutSessionId) {
    throw new Error("A different Checkout Session is already bound to this order");
  }
}

export function claimFulfillmentOwnership(
  order: OpsDragOrder,
  payment: OpsDragPaymentAdmission,
  recordedAt: string
): FulfillmentOwnershipResult {
  assertPaymentMatchesOrder(order, payment);
  const existingOwner = order.fulfillment.lease_owner;

  if (order.processed_event_ids.includes(payment.webhookEventId)) {
    if (!existingOwner) throw new Error("Processed payment event has no fulfillment owner");
    return { disposition: "duplicate", order, leaseOwner: existingOwner };
  }

  if (existingOwner) {
    assertTransition(order.workflow_status, "IN_PROGRESS");
    const duplicateOrder: OpsDragOrder = {
      ...order,
      processed_event_ids: [...order.processed_event_ids, payment.webhookEventId],
      receipts: appendReceipt(order, "DUPLICATE_PAYMENT_EVENT_NOOP", recordedAt, {
        checkout_session_id: payment.checkoutSessionId,
        webhook_event_id: payment.webhookEventId,
        retained_lease_owner: existingOwner,
      }),
    };
    return { disposition: "duplicate", order: duplicateOrder, leaseOwner: existingOwner };
  }

  assertTransition(order.workflow_status, "IN_PROGRESS");
  const leaseOwner = createLeaseOwner(payment);
  const acquired: OpsDragOrder = {
    ...order,
    workflow_status: "IN_PROGRESS",
    payment,
    fulfillment: { lease_owner: leaseOwner, lease_acquired_at: recordedAt },
    processed_event_ids: [...order.processed_event_ids, payment.webhookEventId],
    receipts: [],
  };
  acquired.receipts = appendReceipt(
    { ...acquired, receipts: order.receipts },
    "PAYMENT_ADMITTED_FULFILLMENT_OWNED",
    recordedAt,
    {
      checkout_session_id: payment.checkoutSessionId,
      payment_reference_id: payment.paymentReferenceId,
      webhook_event_id: payment.webhookEventId,
      signature_verified: true,
      amount_total: payment.amountTotal,
      currency: payment.currency,
      paid_at: payment.paidAt,
      snapshot_digest: payment.snapshotDigest,
      customer_email_sha256: payment.customerEmailSha256,
      fulfillment_lease_owner: leaseOwner,
    }
  );
  return { disposition: "acquired", order: acquired, leaseOwner };
}

export function verifyReceiptChain(order: OpsDragOrder): boolean {
  let previous: string | null = null;
  for (let index = 0; index < order.receipts.length; index += 1) {
    const receipt = order.receipts[index];
    const { receipt_hash: receiptHash, ...unsigned } = receipt;
    if (receipt.sequence !== index + 1 || receipt.previous_receipt_hash !== previous) return false;
    if (sha256(canonicalJson(unsigned)) !== receiptHash) return false;
    if (canonicalJson(receipt).includes(order.snapshot.delivery_email)) return false;
    previous = receiptHash;
  }
  return true;
}
