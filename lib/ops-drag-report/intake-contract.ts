import { assertBusinessUseInputCeilingAcknowledgment } from "./accepted-contract.ts";
import { createAdmittedSnapshot, type JsonValue, type OpsDragAdmittedSnapshot } from "./order-foundation.ts";

export const OPS_DRAG_INTAKE_VERSION = "ops_drag_purpose_limited_intake_v1" as const;
export const OPS_DRAG_ALLOWED_ANSWER_KEYS = [
  "businessModel",
  "companyStage",
  "primaryPainArea",
  "highestCostBottleneck",
  "highestCostBottleneckOther",
  "workflowManagement",
  "frequentBreakdown",
  "frequentBreakdownDetail",
  "urgencyWindow",
  "quarterRisk",
  "implementationOwnership",
] as const;

type AllowedAnswerKey = (typeof OPS_DRAG_ALLOWED_ANSWER_KEYS)[number];

export type OpsDragIntakeRequest = {
  businessEmail: string;
  businessUseInputCeilingAcknowledgment: true;
  answers: Partial<Record<AllowedAnswerKey, JsonValue>>;
};

export type OpsDragIntakeStore = {
  admit(snapshot: OpsDragAdmittedSnapshot): Promise<void>;
};

export type OpsDragIntakeDependencies = {
  store: OpsDragIntakeStore;
  createSubmissionId(): string;
  now(): string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECRET_SHAPE = /(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{12,}|(?:password|secret|token)\s*[:=]/i;
const CARD_SHAPE = /(?:\d[ -]*?){13,19}/;

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new Error(`${label} contains unsupported fields`);
}

function normalizeAnswer(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length > 500) throw new Error("Ops Check answer exceeds the input ceiling");
    if (SECRET_SHAPE.test(normalized) || CARD_SHAPE.test(normalized)) throw new Error("Ops Check answer violates the input ceiling");
    return normalized;
  }
  if (Array.isArray(value)) {
    if (value.length > 20) throw new Error("Ops Check answer exceeds the input ceiling");
    return value.map(normalizeAnswer);
  }
  throw new Error("Ops Check answer type is unsupported");
}

export function validateOpsDragIntakeRequest(input: unknown): OpsDragIntakeRequest {
  const request = readObject(input, "Ops Drag intake");
  assertExactKeys(request, ["businessEmail", "businessUseInputCeilingAcknowledgment", "answers"], "Ops Drag intake");
  assertBusinessUseInputCeilingAcknowledgment(request.businessUseInputCeilingAcknowledgment);
  const email = typeof request.businessEmail === "string" ? request.businessEmail.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new Error("A valid business email is required");
  const sourceAnswers = readObject(request.answers, "Ops Check answers");
  assertExactKeys(sourceAnswers, OPS_DRAG_ALLOWED_ANSWER_KEYS, "Ops Check answers");
  const answers: Partial<Record<AllowedAnswerKey, JsonValue>> = {};
  for (const key of OPS_DRAG_ALLOWED_ANSWER_KEYS) {
    if (sourceAnswers[key] !== undefined) answers[key] = normalizeAnswer(sourceAnswers[key]);
  }
  return { businessEmail: email, businessUseInputCeilingAcknowledgment: true, answers };
}

export async function admitOpsDragIntake(
  rawInput: unknown,
  dependencies: OpsDragIntakeDependencies
): Promise<{ version: typeof OPS_DRAG_INTAKE_VERSION; submission_id: string; snapshot_digest: string }> {
  const input = validateOpsDragIntakeRequest(rawInput);
  const submissionId = dependencies.createSubmissionId();
  if (!/^sub_[a-z0-9_-]{8,64}$/.test(submissionId)) throw new Error("Submission identifier is invalid");
  const snapshot = createAdmittedSnapshot(
    { work_email: input.businessEmail, raw_answers: input.answers, metadata: {} },
    submissionId,
    dependencies.now()
  );
  await dependencies.store.admit(snapshot);
  return { version: OPS_DRAG_INTAKE_VERSION, submission_id: snapshot.submission_id, snapshot_digest: snapshot.digest };
}
