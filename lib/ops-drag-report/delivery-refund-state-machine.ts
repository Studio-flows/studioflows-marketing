import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  appendReceipt,
  canonicalJson,
  sha256,
  type JsonValue,
  type OpsDragAutomationAttempt,
  type OpsDragAutomationState,
  type OpsDragOrder,
  type OpsDragTerminalDisposition,
} from "./order-foundation.ts";

export const OPS_DRAG_REPORT_SCHEMA_VERSION = "ops_drag_report_v1" as const;
export const OPS_DRAG_REPORT_TEMPLATE_VERSION = "ops_drag_report_template_v1" as const;
export const OPS_DRAG_REPORT_PDF_FILENAME = "studioflows-ops-drag-report.pdf" as const;
export const OPS_DRAG_REPORT_MAX_PDF_BYTES = 512_000 as const;
export const OPS_DRAG_REPORT_GENERATION_MAX_ATTEMPTS = 3 as const;
export const OPS_DRAG_REPORT_DELIVERY_MAX_ATTEMPTS = 3 as const;
export const OPS_DRAG_REPORT_REFUND_MAX_ATTEMPTS = 3 as const;

export type OpsDragReportDocument = {
  schema_version: typeof OPS_DRAG_REPORT_SCHEMA_VERSION;
  template_version: typeof OPS_DRAG_REPORT_TEMPLATE_VERSION;
  order_id: string;
  submission_id: string;
  generated_at: string;
  title: string;
  summary: string;
  hypotheses: string[];
  seven_day_sequence: [string, string, string, string, string, string, string];
  limitations: string;
  evidence_to_collect: string[];
};

export type ValidatedReport = {
  report: OpsDragReportDocument;
  reportSha256: string;
  pdfSha256: string;
};

export type PersistedReportArtifact = {
  filename: typeof OPS_DRAG_REPORT_PDF_FILENAME;
  pdfBytes: Uint8Array;
  reportSha256: string;
  pdfSha256: string;
};

export type ReportGenerationAdapter = {
  generate(input: {
    orderId: string;
    submissionId: string;
    snapshotDigest: string;
    snapshot: OpsDragOrder["snapshot"];
    generatedAt: string;
    templateVersion: typeof OPS_DRAG_REPORT_TEMPLATE_VERSION;
  }): Promise<{ report: unknown; pdfBytes: Uint8Array }>;
};

export type EmailProviderAdapter = {
  submit(input: {
    orderId: string;
    submissionId: string;
    deliveryEmail: string;
    reportSha256: string;
    pdfSha256: string;
    pdfBytes: Uint8Array;
    filename: string;
    attemptNumber: number;
  }): Promise<{ providerMessageId: string }>;
};

export type RefundProviderAdapter = {
  requestFullRefund(input: {
    checkoutSessionId: string;
    paymentReferenceId: string;
    remainingRefundableAmount: number;
    currency: "usd";
    idempotencyKey: string;
  }): Promise<{ providerRefundId: string }>;
};

export type EmailProviderEvent = {
  eventId: string;
  providerMessageId: string;
  type: "accepted" | "queued" | "sent" | "delivered" | "hard_bounce" | "failed";
};

export type ProviderEventTransition = "APPLY" | "EVIDENCE_ONLY";

type DeliveryStatus = OpsDragAutomationState["delivery"]["status"];
type EmailProviderEventType = EmailProviderEvent["type"];

export const EMAIL_PROVIDER_EVENT_TRANSITION_MATRIX: Record<
  DeliveryStatus,
  Record<EmailProviderEventType, ProviderEventTransition>
> = {
  PENDING: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "EVIDENCE_ONLY",
    hard_bounce: "EVIDENCE_ONLY",
    failed: "EVIDENCE_ONLY",
  },
  SUBMITTING: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "EVIDENCE_ONLY",
    hard_bounce: "EVIDENCE_ONLY",
    failed: "EVIDENCE_ONLY",
  },
  SUBMITTED: {
    accepted: "APPLY",
    queued: "APPLY",
    sent: "APPLY",
    delivered: "APPLY",
    hard_bounce: "APPLY",
    failed: "APPLY",
  },
  ACCEPTED: {
    accepted: "EVIDENCE_ONLY",
    queued: "APPLY",
    sent: "APPLY",
    delivered: "APPLY",
    hard_bounce: "APPLY",
    failed: "APPLY",
  },
  QUEUED: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "APPLY",
    delivered: "APPLY",
    hard_bounce: "APPLY",
    failed: "APPLY",
  },
  SENT: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "APPLY",
    hard_bounce: "APPLY",
    failed: "APPLY",
  },
  DELIVERED: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "EVIDENCE_ONLY",
    hard_bounce: "EVIDENCE_ONLY",
    failed: "EVIDENCE_ONLY",
  },
  HARD_BOUNCE: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "EVIDENCE_ONLY",
    hard_bounce: "EVIDENCE_ONLY",
    failed: "EVIDENCE_ONLY",
  },
  RETRYABLE: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "APPLY",
    hard_bounce: "APPLY",
    failed: "APPLY",
  },
  FAILED: {
    accepted: "EVIDENCE_ONLY",
    queued: "EVIDENCE_ONLY",
    sent: "EVIDENCE_ONLY",
    delivered: "EVIDENCE_ONLY",
    hard_bounce: "EVIDENCE_ONLY",
    failed: "EVIDENCE_ONLY",
  },
};

export type RefundProviderEvent = {
  eventId: string;
  providerRefundId: string;
  type: "refund.created" | "refund.pending" | "refund.succeeded" | "refund.failed";
};

export type RefundOwnershipResult =
  | { disposition: "acquired"; order: OpsDragOrder; leaseOwner: string; idempotencyKey: string }
  | { disposition: "duplicate"; order: OpsDragOrder; leaseOwner: string; idempotencyKey: string };

export type DeliverySubmissionOwnershipResult = {
  order: OpsDragOrder;
  attemptNumber: number;
  leaseOwner: string;
  idempotencyKey: string;
};

export type OrderTokenAction = "results" | "redelivery" | "refund";

type OrderTokenClaims = {
  version: "v1";
  order_id: string;
  action: OrderTokenAction;
  token_id: string;
  issued_at: string;
  expires_at: string;
};

const REPORT_FIELDS = [
  "schema_version",
  "template_version",
  "order_id",
  "submission_id",
  "generated_at",
  "title",
  "summary",
  "hypotheses",
  "seven_day_sequence",
  "limitations",
  "evidence_to_collect",
] as const;

const SECRET_PATTERNS = [
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\bwhsec_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
] as const;

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bguarantee(?:d|s)?\b/i,
  /\bwill (?:increase|decrease|eliminate|save)\b/i,
  /\bproven to\b/i,
  /\b(?:legal|tax|medical|financial) advice\b/i,
  /\bcompliance certification\b/i,
  /\bwe (?:audited|verified) your\b/i,
] as const;

const BLOCKED_COMMERCIAL_CONTENT_PATTERNS = [
  /\bhttps?:\/\/|\bwww\.|\b[a-z0-9.-]+\.(?:com|co|io|net|org)\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /[$€£]\s?\d|\b(?:usd|eur|gbp)\s?\d|\b\d+(?:\.\d{1,2})?\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b/i,
  /\b(?:price|pricing|checkout|purchase|buy|subscription|subscribe)\b/i,
  /\b(?:book|schedule)\s+(?:a\s+)?call\b/i,
  /\b(?:consulting|implementation)\b/i,
  /\bprofessional\s+(?:services?|advice)\b/i,
  /\b(?:password|api[_ -]?key|access[_ -]?token|secret[_ -]?key|credential)s?\b/i,
] as const;

function requirePaidOrder(order: OpsDragOrder): void {
  if (!order.payment || !order.fulfillment.lease_owner) {
    throw new Error("Delivery automation requires an admitted payment and fulfillment owner");
  }
}

function parseTime(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO timestamp`);
  return parsed;
}

function addMinutes(value: string, minutes: number): string {
  return new Date(parseTime(value, "SLA origin") + minutes * 60_000).toISOString();
}

function createAttempt(
  order: OpsDragOrder,
  kind: OpsDragAutomationAttempt["kind"],
  attemptNumber: number,
  state: OpsDragAutomationAttempt["state"],
  recordedAt: string,
  failureCode: string | null
): OpsDragAutomationAttempt {
  return {
    attempt_id: `att_${sha256(`${order.order_id}|${kind}|${attemptNumber}|${recordedAt}`).slice(0, 32)}`,
    kind,
    attempt_number: attemptNumber,
    state,
    recorded_at: recordedAt,
    failure_code: failureCode,
  };
}

function initializeAutomation(order: OpsDragOrder): OpsDragAutomationState {
  requirePaidOrder(order);
  if (order.automation) return order.automation;
  const paidAt = order.payment!.paidAt;
  return {
    version: "v1",
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    terminal_disposition: null,
    generation: {
      status: "PENDING",
      attempts: 0,
      max_attempts: OPS_DRAG_REPORT_GENERATION_MAX_ATTEMPTS,
      report_schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
      report_sha256: null,
      pdf_sha256: null,
      validated_at: null,
      artifact: null,
    },
    delivery: {
      status: "PENDING",
      attempts: 0,
      max_attempts: OPS_DRAG_REPORT_DELIVERY_MAX_ATTEMPTS,
      provider_message_id: null,
      submission_lease_owner: null,
      submission_idempotency_key: null,
      delivered_at: null,
    },
    refund: {
      status: "NOT_REQUIRED",
      attempts: 0,
      max_attempts: OPS_DRAG_REPORT_REFUND_MAX_ATTEMPTS,
      lease_owner: null,
      idempotency_key: null,
      provider_refund_id: null,
    },
    sla: {
      generation_due_at: addMinutes(paidAt, 1),
      delivery_submit_due_at: addMinutes(paidAt, 10),
      delivery_confirmation_due_at: addMinutes(paidAt, 30),
      refund_eligible_at: addMinutes(paidAt, 45),
      refund_initiation_due_at: addMinutes(paidAt, 60),
    },
    attempts: [],
    processed_provider_event_ids: [],
    consumed_token_ids: [],
    blocker_code: null,
  };
}

function cloneWithAutomation(order: OpsDragOrder): { order: OpsDragOrder; automation: OpsDragAutomationState } {
  const automation = structuredClone(initializeAutomation(order));
  return { order: { ...order, automation }, automation };
}

function appendAutomationReceipt(
  order: OpsDragOrder,
  kind: Parameters<typeof appendReceipt>[1],
  recordedAt: string,
  evidence: { [key: string]: JsonValue }
): OpsDragOrder {
  return { ...order, receipts: appendReceipt(order, kind, recordedAt, evidence) };
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function requireStringArray(value: unknown, label: string, minimum: number, maximum: number): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} must contain ${minimum === maximum ? minimum : `${minimum}-${maximum}`} entries`);
  }
  return value.map((entry, index) => requireNonEmptyString(entry, `${label}[${index}]`));
}

function assertExactFields(value: Record<string, unknown>): void {
  const actual = Object.keys(value).sort();
  const expected = [...REPORT_FIELDS].sort();
  if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error("Report contains missing or unsupported fields");
}

export function assertOpsDragReportContentAllowed(content: string): void {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new Error("Report contains secret-shaped content");
  }
  if (UNSUPPORTED_CLAIM_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new Error("Report contains an unsupported claim");
  }
  if (BLOCKED_COMMERCIAL_CONTENT_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new Error("Report contains blocked commercial content");
  }
}

function scanReportContent(report: OpsDragReportDocument): void {
  assertOpsDragReportContentAllowed(canonicalJson(report));
}

export function validateGeneratedReport(
  order: OpsDragOrder,
  candidate: unknown,
  pdfBytes: Uint8Array
): ValidatedReport {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Generated report must be an object");
  }
  if (pdfBytes.byteLength === 0 || pdfBytes.byteLength > OPS_DRAG_REPORT_MAX_PDF_BYTES) {
    throw new Error("Generated report PDF size is invalid");
  }
  const value = candidate as Record<string, unknown>;
  assertExactFields(value);
  const sevenDaySequence = requireStringArray(value.seven_day_sequence, "seven_day_sequence", 7, 7);
  const report: OpsDragReportDocument = {
    schema_version: value.schema_version as typeof OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: value.template_version as typeof OPS_DRAG_REPORT_TEMPLATE_VERSION,
    order_id: requireNonEmptyString(value.order_id, "order_id"),
    submission_id: requireNonEmptyString(value.submission_id, "submission_id"),
    generated_at: requireNonEmptyString(value.generated_at, "generated_at"),
    title: requireNonEmptyString(value.title, "title"),
    summary: requireNonEmptyString(value.summary, "summary"),
    hypotheses: requireStringArray(value.hypotheses, "hypotheses", 1, 3),
    seven_day_sequence: sevenDaySequence as OpsDragReportDocument["seven_day_sequence"],
    limitations: requireNonEmptyString(value.limitations, "limitations"),
    evidence_to_collect: requireStringArray(value.evidence_to_collect, "evidence_to_collect", 1, 7),
  };
  if (report.schema_version !== OPS_DRAG_REPORT_SCHEMA_VERSION) throw new Error("Report schema version mismatch");
  if (report.template_version !== OPS_DRAG_REPORT_TEMPLATE_VERSION) throw new Error("Report template version mismatch");
  if (report.order_id !== order.order_id || report.submission_id !== order.submission_id) {
    throw new Error("Report order binding mismatch");
  }
  parseTime(report.generated_at, "generated_at");
  scanReportContent(report);
  return {
    report,
    reportSha256: sha256(canonicalJson(report)),
    pdfSha256: createHash("sha256").update(pdfBytes).digest("hex"),
  };
}

export function startGenerationAttempt(order: OpsDragOrder, recordedAt: string): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition) throw new Error("Terminal orders cannot start generation");
  if (next.automation.refund.status !== "NOT_REQUIRED") throw new Error("Refund-path orders cannot start generation");
  if (next.automation.generation.status === "VALIDATED") return order;
  if (next.automation.generation.status !== "PENDING" && next.automation.generation.status !== "RETRYABLE") {
    throw new Error(`Generation cannot start from ${next.automation.generation.status}`);
  }
  if (next.automation.generation.attempts >= next.automation.generation.max_attempts) {
    throw new Error("Report generation retry budget exhausted");
  }
  const attemptNumber = next.automation.generation.attempts + 1;
  next.automation.generation.attempts = attemptNumber;
  next.automation.generation.status = "IN_PROGRESS";
  next.automation.attempts.push(createAttempt(order, "GENERATION", attemptNumber, "STARTED", recordedAt, null));
  return appendAutomationReceipt(next.order, "GENERATION_ATTEMPT_RECORDED", recordedAt, {
    attempt_number: attemptNumber,
    max_attempts: next.automation.generation.max_attempts,
    generation_due_at: next.automation.sla.generation_due_at,
  });
}

export function recordGenerationFailure(order: OpsDragOrder, failureCode: string, recordedAt: string): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.generation.status !== "IN_PROGRESS" || next.automation.generation.attempts === 0) {
    throw new Error("Generation failure requires an active attempt");
  }
  const exhausted = next.automation.generation.attempts >= next.automation.generation.max_attempts;
  next.automation.generation.status = exhausted ? "FAILED" : "RETRYABLE";
  next.automation.blocker_code = exhausted ? "REPORT_GENERATION_RETRY_EXHAUSTED" : null;
  next.order.workflow_status = exhausted ? "BLOCKED" : "IN_PROGRESS";
  next.automation.attempts.push(
    createAttempt(order, "GENERATION", next.automation.generation.attempts, "FAILED", recordedAt, failureCode)
  );
  return appendAutomationReceipt(next.order, "GENERATION_ATTEMPT_RECORDED", recordedAt, {
    attempt_number: next.automation.generation.attempts,
    state: exhausted ? "FAILED" : "RETRYABLE",
    failure_code: failureCode,
  });
}

export function admitGeneratedReport(
  order: OpsDragOrder,
  candidate: unknown,
  pdfBytes: Uint8Array,
  recordedAt: string
): OpsDragOrder {
  const validated = validateGeneratedReport(order, candidate, pdfBytes);
  const next = cloneWithAutomation(order);
  if (next.automation.refund.status !== "NOT_REQUIRED") throw new Error("Refund-path orders cannot admit reports");
  if (next.automation.generation.status !== "IN_PROGRESS" || next.automation.generation.attempts === 0) {
    throw new Error("Report admission requires an active generation attempt");
  }
  next.automation.generation.status = "VALIDATED";
  next.automation.generation.report_sha256 = validated.reportSha256;
  next.automation.generation.pdf_sha256 = validated.pdfSha256;
  next.automation.generation.validated_at = recordedAt;
  next.automation.generation.artifact = {
    storage: "ORDER_METADATA_INLINE_V1",
    filename: OPS_DRAG_REPORT_PDF_FILENAME,
    pdf_base64: Buffer.from(pdfBytes).toString("base64"),
    report_sha256: validated.reportSha256,
    pdf_sha256: validated.pdfSha256,
  };
  next.automation.attempts.push(
    createAttempt(order, "GENERATION", next.automation.generation.attempts, "VALIDATED", recordedAt, null)
  );
  return appendAutomationReceipt(next.order, "REPORT_VALIDATED", recordedAt, {
    report_schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    report_sha256: validated.reportSha256,
    pdf_sha256: validated.pdfSha256,
    secret_scan: "PASS",
    unsupported_claim_scan: "PASS",
  });
}

export function readPersistedReportArtifact(order: OpsDragOrder): PersistedReportArtifact {
  const automation = initializeAutomation(order);
  const artifact = automation.generation.artifact;
  if (automation.generation.status !== "VALIDATED" || !artifact) {
    throw new Error("A validated persisted report artifact is required");
  }
  if (
    artifact.storage !== "ORDER_METADATA_INLINE_V1" ||
    artifact.filename !== OPS_DRAG_REPORT_PDF_FILENAME ||
    artifact.report_sha256 !== automation.generation.report_sha256 ||
    artifact.pdf_sha256 !== automation.generation.pdf_sha256
  ) {
    throw new Error("Persisted report artifact binding mismatch");
  }
  const pdfBytes = Buffer.from(artifact.pdf_base64, "base64");
  if (
    pdfBytes.byteLength === 0 ||
    pdfBytes.byteLength > OPS_DRAG_REPORT_MAX_PDF_BYTES ||
    pdfBytes.toString("base64") !== artifact.pdf_base64 ||
    createHash("sha256").update(pdfBytes).digest("hex") !== artifact.pdf_sha256
  ) {
    throw new Error("Persisted report artifact failed integrity validation");
  }
  return {
    filename: artifact.filename,
    pdfBytes,
    reportSha256: artifact.report_sha256,
    pdfSha256: artifact.pdf_sha256,
  };
}

export function startDeliveryAttempt(
  order: OpsDragOrder,
  providerMessageId: string,
  recordedAt: string
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition) throw new Error("Terminal orders cannot start delivery");
  if (next.automation.refund.status !== "NOT_REQUIRED") throw new Error("Refund-path orders cannot start delivery");
  if (next.automation.generation.status !== "VALIDATED") throw new Error("Delivery requires a validated report");
  if (
    next.automation.delivery.status === "SUBMITTED" &&
    next.automation.delivery.provider_message_id === providerMessageId
  ) {
    return order;
  }
  if (
    next.automation.delivery.status !== "PENDING" &&
    next.automation.delivery.status !== "RETRYABLE" &&
    next.automation.delivery.status !== "SUBMITTING"
  ) {
    throw new Error(`Delivery cannot start from ${next.automation.delivery.status}`);
  }
  let attemptNumber = next.automation.delivery.attempts;
  if (next.automation.delivery.status !== "SUBMITTING") {
    if (attemptNumber >= next.automation.delivery.max_attempts) throw new Error("Delivery retry budget exhausted");
    attemptNumber += 1;
    next.automation.delivery.attempts = attemptNumber;
  } else if (!next.automation.delivery.submission_lease_owner || !next.automation.delivery.submission_idempotency_key) {
    throw new Error("Delivery submission lease binding is missing");
  }
  next.automation.delivery.status = "SUBMITTED";
  next.automation.delivery.provider_message_id = requireNonEmptyString(providerMessageId, "providerMessageId");
  next.automation.attempts.push(createAttempt(order, "DELIVERY", attemptNumber, "SUBMITTED", recordedAt, null));
  return appendAutomationReceipt(next.order, "DELIVERY_ATTEMPT_RECORDED", recordedAt, {
    attempt_number: attemptNumber,
    provider_message_id: providerMessageId,
    delivery_confirmation_due_at: next.automation.sla.delivery_confirmation_due_at,
  });
}

export function claimDeliverySubmissionAttempt(
  order: OpsDragOrder,
  recordedAt: string
): DeliverySubmissionOwnershipResult {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition) throw new Error("Terminal orders cannot claim delivery submission");
  if (next.automation.refund.status !== "NOT_REQUIRED") throw new Error("Refund-path orders cannot claim delivery submission");
  if (next.automation.generation.status !== "VALIDATED") throw new Error("Delivery submission requires a validated report");
  if (next.automation.delivery.status === "SUBMITTING") {
    if (!next.automation.delivery.submission_lease_owner || !next.automation.delivery.submission_idempotency_key) {
      throw new Error("Delivery submission lease binding is missing");
    }
    return {
      order,
      attemptNumber: next.automation.delivery.attempts,
      leaseOwner: next.automation.delivery.submission_lease_owner,
      idempotencyKey: next.automation.delivery.submission_idempotency_key,
    };
  }
  if (next.automation.delivery.status !== "PENDING" && next.automation.delivery.status !== "RETRYABLE") {
    throw new Error(`Delivery submission cannot be claimed from ${next.automation.delivery.status}`);
  }
  if (next.automation.delivery.attempts >= next.automation.delivery.max_attempts) {
    throw new Error("Delivery retry budget exhausted");
  }
  const attemptNumber = next.automation.delivery.attempts + 1;
  const idempotencyKey = `ops-drag:${order.order_id}:delivery:${attemptNumber}:v1`;
  const leaseOwner = `del_${sha256(`${order.order_id}|${idempotencyKey}|v1`).slice(0, 32)}`;
  next.automation.delivery.status = "SUBMITTING";
  next.automation.delivery.attempts = attemptNumber;
  next.automation.delivery.submission_lease_owner = leaseOwner;
  next.automation.delivery.submission_idempotency_key = idempotencyKey;
  next.automation.attempts.push(createAttempt(order, "DELIVERY", attemptNumber, "STARTED", recordedAt, null));
  const updated = appendAutomationReceipt(next.order, "DELIVERY_ATTEMPT_RECORDED", recordedAt, {
    attempt_number: attemptNumber,
    state: "SUBMITTING",
    delivery_lease_owner: leaseOwner,
    delivery_idempotency_key: idempotencyKey,
  });
  return { order: updated, attemptNumber, leaseOwner, idempotencyKey };
}

export function recordDeliverySubmissionFailure(
  order: OpsDragOrder,
  attemptNumber: number,
  failureCode: string,
  recordedAt: string
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition || next.automation.refund.status !== "NOT_REQUIRED") return order;
  if (
    next.automation.delivery.status !== "PENDING" &&
    next.automation.delivery.status !== "RETRYABLE" &&
    next.automation.delivery.status !== "SUBMITTING"
  ) {
    return order;
  }
  if (next.automation.delivery.status === "SUBMITTING") {
    if (next.automation.delivery.attempts !== attemptNumber) return order;
  } else if (next.automation.delivery.attempts >= attemptNumber) return order;
  if (
    next.automation.delivery.status !== "SUBMITTING" &&
    attemptNumber !== next.automation.delivery.attempts + 1
  ) {
    throw new Error("Delivery failure attempt binding mismatch");
  }
  next.automation.delivery.attempts = attemptNumber;
  const exhausted = attemptNumber >= next.automation.delivery.max_attempts;
  next.automation.delivery.status = exhausted ? "FAILED" : "RETRYABLE";
  next.automation.attempts.push(
    createAttempt(order, "DELIVERY", attemptNumber, "FAILED", recordedAt, failureCode)
  );
  let updated = appendAutomationReceipt(next.order, "DELIVERY_ATTEMPT_RECORDED", recordedAt, {
    attempt_number: attemptNumber,
    state: exhausted ? "FAILED" : "RETRYABLE",
    provider_message_id: null,
    failure_code: failureCode,
  });
  if (exhausted) updated = requireRefund(updated, "DELIVERY_RETRY_EXHAUSTED", recordedAt);
  return updated;
}

function setTerminal(
  order: OpsDragOrder,
  disposition: OpsDragTerminalDisposition,
  recordedAt: string,
  evidence: { [key: string]: JsonValue }
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition && next.automation.terminal_disposition !== disposition) {
    throw new Error(`Order already terminated as ${next.automation.terminal_disposition}`);
  }
  if (next.automation.terminal_disposition === disposition) return order;
  next.automation.terminal_disposition = disposition;
  next.order.workflow_status = "DONE";
  return appendAutomationReceipt(next.order, "ORDER_TERMINAL", recordedAt, {
    terminal_disposition: disposition,
    ...evidence,
  });
}

function requireRefund(order: OpsDragOrder, reason: string, recordedAt: string): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition === "DELIVERED") throw new Error("Delivered orders cannot require refunds");
  if (next.automation.terminal_disposition === "REFUNDED") return order;
  if (next.automation.refund.status !== "NOT_REQUIRED") return order;
  if (next.automation.delivery.status === "SUBMITTING") return order;
  next.automation.refund.status = "REQUIRED";
  return appendAutomationReceipt(next.order, "REFUND_REQUIRED", recordedAt, {
    reason,
    refund_eligible_at: next.automation.sla.refund_eligible_at,
    refund_initiation_due_at: next.automation.sla.refund_initiation_due_at,
  });
}

function classifyEmailProviderEvent(
  automation: OpsDragAutomationState,
  eventType: EmailProviderEventType
): { transition: ProviderEventTransition; reason: string | null } {
  if (automation.terminal_disposition) {
    return { transition: "EVIDENCE_ONLY", reason: `ORDER_TERMINAL_${automation.terminal_disposition}` };
  }
  if (automation.refund.status !== "NOT_REQUIRED") {
    return { transition: "EVIDENCE_ONLY", reason: `REFUND_PATH_${automation.refund.status}` };
  }
  const transition = EMAIL_PROVIDER_EVENT_TRANSITION_MATRIX[automation.delivery.status][eventType];
  return {
    transition,
    reason: transition === "EVIDENCE_ONLY" ? `DELIVERY_STATE_${automation.delivery.status}` : null,
  };
}

export function applyEmailProviderEvent(
  order: OpsDragOrder,
  event: EmailProviderEvent,
  recordedAt: string
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.processed_provider_event_ids.includes(event.eventId)) return order;
  if (next.automation.delivery.provider_message_id !== event.providerMessageId) {
    throw new Error("Email provider event message binding mismatch");
  }
  const priorDeliveryStatus = next.automation.delivery.status;
  const priorRefundStatus = next.automation.refund.status;
  const classification = classifyEmailProviderEvent(next.automation, event.type);
  next.automation.processed_provider_event_ids.push(event.eventId);
  if (classification.transition === "EVIDENCE_ONLY") {
    return appendAutomationReceipt(next.order, "DELIVERY_PROVIDER_EVENT_RECORDED", recordedAt, {
      provider_event_id: event.eventId,
      provider_message_id: event.providerMessageId,
      provider_state: event.type,
      provider_confirmed_delivered: event.type === "delivered",
      transition_disposition: classification.transition,
      contradiction_reason: classification.reason,
      prior_delivery_state: priorDeliveryStatus,
      refund_state: priorRefundStatus,
      delivery_terminal_eligible: false,
    });
  }
  const state = event.type === "hard_bounce" ? "HARD_BOUNCE" : event.type.toUpperCase();
  next.automation.delivery.status = state as OpsDragAutomationState["delivery"]["status"];
  let updated = appendAutomationReceipt(next.order, "DELIVERY_PROVIDER_EVENT_RECORDED", recordedAt, {
    provider_event_id: event.eventId,
    provider_message_id: event.providerMessageId,
    provider_state: event.type,
    provider_confirmed_delivered: event.type === "delivered",
    transition_disposition: classification.transition,
    contradiction_reason: null,
    prior_delivery_state: priorDeliveryStatus,
    refund_state: priorRefundStatus,
    delivery_terminal_eligible: event.type === "delivered",
  });
  if (event.type === "delivered") {
    const delivered = cloneWithAutomation(updated);
    delivered.automation.delivery.delivered_at = recordedAt;
    delivered.automation.attempts.push(
      createAttempt(order, "DELIVERY", delivered.automation.delivery.attempts, "SUCCEEDED", recordedAt, null)
    );
    updated = setTerminal(delivered.order, "DELIVERED", recordedAt, {
      provider_message_id: event.providerMessageId,
      provider_event_id: event.eventId,
    });
  } else if (event.type === "hard_bounce") {
    updated = requireRefund(updated, "DELIVERY_HARD_BOUNCE", recordedAt);
  } else if (event.type === "failed") {
    const failed = cloneWithAutomation(updated);
    failed.automation.delivery.status =
      failed.automation.delivery.attempts >= failed.automation.delivery.max_attempts ? "FAILED" : "RETRYABLE";
    failed.automation.attempts.push(
      createAttempt(order, "DELIVERY", failed.automation.delivery.attempts, "FAILED", recordedAt, "PROVIDER_FAILED")
    );
    updated = failed.order;
    if (failed.automation.delivery.status === "FAILED") {
      updated = requireRefund(updated, "DELIVERY_RETRY_EXHAUSTED", recordedAt);
    }
  }
  return updated;
}

export function expireDeliverySla(order: OpsDragOrder, recordedAt: string): OpsDragOrder {
  const automation = initializeAutomation(order);
  if (automation.terminal_disposition || automation.refund.status !== "NOT_REQUIRED") return order;
  if (parseTime(recordedAt, "recordedAt") < parseTime(automation.sla.refund_eligible_at, "refund_eligible_at")) {
    throw new Error("Delivery refund SLA has not expired");
  }
  return requireRefund(order, "DELIVERY_CONFIRMATION_SLA_EXPIRED", recordedAt);
}

export function createRefundIdempotencyKey(order: OpsDragOrder): string {
  requirePaidOrder(order);
  return `ops-drag:${order.payment!.checkoutSessionId}:refund:v1`;
}

export function claimRefundAttempt(order: OpsDragOrder, recordedAt: string): RefundOwnershipResult {
  const next = cloneWithAutomation(order);
  if (next.automation.terminal_disposition === "DELIVERED") throw new Error("Delivered orders cannot be refunded");
  if (next.automation.refund.status === "SUCCEEDED" || next.automation.terminal_disposition === "REFUNDED") {
    return {
      disposition: "duplicate",
      order,
      leaseOwner: next.automation.refund.lease_owner!,
      idempotencyKey: next.automation.refund.idempotency_key!,
    };
  }
  if (next.automation.refund.status === "OWNED" || next.automation.refund.status === "CREATED") {
    return {
      disposition: "duplicate",
      order,
      leaseOwner: next.automation.refund.lease_owner!,
      idempotencyKey: next.automation.refund.idempotency_key!,
    };
  }
  if (next.automation.refund.attempts >= next.automation.refund.max_attempts) {
    throw new Error("Refund retry budget exhausted");
  }
  if (next.automation.refund.status !== "REQUIRED" && next.automation.refund.status !== "RETRYABLE") {
    throw new Error("Refund ownership requires an eligible refund state");
  }
  const attemptNumber = next.automation.refund.attempts + 1;
  const idempotencyKey = next.automation.refund.idempotency_key ?? createRefundIdempotencyKey(order);
  const leaseOwner = next.automation.refund.lease_owner ??
    `ref_${sha256(`${order.order_id}|${idempotencyKey}|v1`).slice(0, 32)}`;
  next.automation.refund.status = "OWNED";
  next.automation.refund.attempts = attemptNumber;
  next.automation.refund.idempotency_key = idempotencyKey;
  next.automation.refund.lease_owner = leaseOwner;
  next.automation.attempts.push(createAttempt(order, "REFUND", attemptNumber, "STARTED", recordedAt, null));
  const updated = appendAutomationReceipt(next.order, "REFUND_ATTEMPT_OWNED", recordedAt, {
    attempt_number: attemptNumber,
    max_attempts: next.automation.refund.max_attempts,
    refund_lease_owner: leaseOwner,
    refund_idempotency_key: idempotencyKey,
    amount_total: 2900,
    currency: "usd",
  });
  return { disposition: "acquired", order: updated, leaseOwner, idempotencyKey };
}

export function applyRefundProviderEvent(
  order: OpsDragOrder,
  event: RefundProviderEvent,
  recordedAt: string
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.processed_provider_event_ids.includes(event.eventId)) return order;
  if (next.automation.terminal_disposition === "REFUNDED") return order;
  if (next.automation.terminal_disposition === "DELIVERED") {
    throw new Error("Delivered orders cannot accept refund events");
  }
  if (!next.automation.refund.lease_owner || !next.automation.refund.idempotency_key) {
    throw new Error("Refund provider events require an owned refund attempt");
  }
  if (
    next.automation.refund.provider_refund_id &&
    next.automation.refund.provider_refund_id !== event.providerRefundId
  ) {
    throw new Error("Refund provider event binding mismatch");
  }
  next.automation.refund.provider_refund_id = event.providerRefundId;
  next.automation.processed_provider_event_ids.push(event.eventId);
  next.automation.refund.status = event.type === "refund.created"
    ? "CREATED"
    : event.type === "refund.succeeded"
      ? "SUCCEEDED"
      : event.type === "refund.failed"
        ? "RETRYABLE"
        : next.automation.refund.status;
  let updated = appendAutomationReceipt(next.order, "REFUND_PROVIDER_EVENT_RECORDED", recordedAt, {
    provider_event_id: event.eventId,
    provider_refund_id: event.providerRefundId,
    provider_state: event.type,
    provider_confirmed_refunded: event.type === "refund.succeeded",
  });
  if (event.type === "refund.succeeded") {
    const succeeded = cloneWithAutomation(updated);
    succeeded.automation.attempts.push(
      createAttempt(order, "REFUND", succeeded.automation.refund.attempts, "SUCCEEDED", recordedAt, null)
    );
    return setTerminal(succeeded.order, "REFUNDED", recordedAt, {
      provider_refund_id: event.providerRefundId,
      provider_event_id: event.eventId,
    });
  }
  if (event.type === "refund.failed") {
    const failed = cloneWithAutomation(updated);
    const exhausted = failed.automation.refund.attempts >= failed.automation.refund.max_attempts;
    failed.automation.refund.status = exhausted ? "FAILED" : "RETRYABLE";
    failed.automation.blocker_code = exhausted ? "DELIVERY_FAILED_REFUND_FAILED" : null;
    failed.order.workflow_status = exhausted ? "BLOCKED" : "IN_PROGRESS";
    failed.automation.attempts.push(
      createAttempt(order, "REFUND", failed.automation.refund.attempts, "FAILED", recordedAt, "PROVIDER_FAILED")
    );
    updated = failed.order;
  }
  return updated;
}

export function recordRefundRequestFailure(
  order: OpsDragOrder,
  failureCode: string,
  recordedAt: string
): OpsDragOrder {
  const next = cloneWithAutomation(order);
  if (next.automation.refund.status !== "OWNED" || next.automation.refund.attempts === 0) {
    throw new Error("Refund request failure requires an owned attempt");
  }
  const exhausted = next.automation.refund.attempts >= next.automation.refund.max_attempts;
  next.automation.refund.status = exhausted ? "FAILED" : "RETRYABLE";
  next.automation.blocker_code = exhausted ? "DELIVERY_FAILED_REFUND_FAILED" : null;
  next.order.workflow_status = exhausted ? "BLOCKED" : "IN_PROGRESS";
  next.automation.attempts.push(
    createAttempt(order, "REFUND", next.automation.refund.attempts, "FAILED", recordedAt, failureCode)
  );
  return appendAutomationReceipt(next.order, "REFUND_PROVIDER_EVENT_RECORDED", recordedAt, {
    provider_event_id: null,
    provider_refund_id: null,
    provider_state: "request_failed",
    provider_confirmed_refunded: false,
    failure_code: failureCode,
    attempt_number: next.automation.refund.attempts,
  });
}

export function countsAsVerifiedFirstSale(order: OpsDragOrder): boolean {
  return order.automation?.terminal_disposition === "DELIVERED" &&
    order.automation.delivery.status === "DELIVERED" &&
    Boolean(order.automation.delivery.delivered_at) &&
    order.automation.refund.status === "NOT_REQUIRED" &&
    order.automation.refund.lease_owner === null;
}

function signTokenPayload(payload: string, secret: string): string {
  if (secret.length < 32) throw new Error("Order token secret must be at least 32 characters");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOrderToken(
  order: OpsDragOrder,
  action: OrderTokenAction,
  tokenId: string,
  issuedAt: string,
  expiresAt: string,
  secret: string
): string {
  if (parseTime(expiresAt, "expiresAt") <= parseTime(issuedAt, "issuedAt")) {
    throw new Error("Order token expiry must follow issuance");
  }
  const claims: OrderTokenClaims = {
    version: "v1",
    order_id: order.order_id,
    action,
    token_id: requireNonEmptyString(tokenId, "tokenId"),
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  const payload = Buffer.from(canonicalJson(claims), "utf8").toString("base64url");
  return `v1.${payload}.${signTokenPayload(payload, secret)}`;
}

function readTokenClaims(token: string, secret: string): OrderTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Order token format is invalid");
  const expected = Buffer.from(signTokenPayload(parts[1], secret), "utf8");
  const actual = Buffer.from(parts[2], "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Order token signature is invalid");
  }
  const parsed = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Partial<OrderTokenClaims>;
  if (
    parsed.version !== "v1" ||
    typeof parsed.order_id !== "string" ||
    !["results", "redelivery", "refund"].includes(parsed.action ?? "") ||
    typeof parsed.token_id !== "string" ||
    typeof parsed.issued_at !== "string" ||
    typeof parsed.expires_at !== "string"
  ) {
    throw new Error("Order token claims are invalid");
  }
  return parsed as OrderTokenClaims;
}

export function consumeOrderToken(
  order: OpsDragOrder,
  token: string,
  expectedAction: OrderTokenAction,
  recordedAt: string,
  secret: string
): OpsDragOrder {
  const claims = readTokenClaims(token, secret);
  if (claims.order_id !== order.order_id || claims.action !== expectedAction) {
    throw new Error("Order token binding mismatch");
  }
  const now = parseTime(recordedAt, "recordedAt");
  if (now < parseTime(claims.issued_at, "issued_at") || now > parseTime(claims.expires_at, "expires_at")) {
    throw new Error("Order token is outside its validity window");
  }
  const next = cloneWithAutomation(order);
  if (next.automation.consumed_token_ids.includes(claims.token_id)) {
    throw new Error("Order token has already been consumed");
  }
  next.automation.consumed_token_ids.push(claims.token_id);
  return appendAutomationReceipt(next.order, "ORDER_TOKEN_CONSUMED", recordedAt, {
    token_id_sha256: sha256(claims.token_id),
    action: claims.action,
    expires_at: claims.expires_at,
  });
}
