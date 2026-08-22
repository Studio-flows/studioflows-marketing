import { createHmac, timingSafeEqual } from "node:crypto";

import {
  OPS_DRAG_SNAPSHOT_DIGEST_VERSION,
  assertOpsDragAdmittedSnapshotIntegrity,
  canonicalJson,
  sha256,
  type OpsDragOrder,
} from "../ops-drag-report/order-foundation.ts";

export type OpsTeardownAccessPurpose = "view" | "pdf" | "email";

export type OpsTeardownAccessClaims = {
  version: "v1";
  purpose: OpsTeardownAccessPurpose;
  token_id: string;
  lead_id: string;
  order_id: string;
  checkout_session_id: string;
  payment_reference_id: string;
  snapshot_digest: string;
  snapshot_digest_version: typeof OPS_DRAG_SNAPSHOT_DIGEST_VERSION;
  recipient_sha256: string;
  issued_at: string;
  expires_at: string;
};

const CLAIM_KEYS = [
  "checkout_session_id",
  "expires_at",
  "issued_at",
  "lead_id",
  "order_id",
  "payment_reference_id",
  "purpose",
  "recipient_sha256",
  "snapshot_digest",
  "snapshot_digest_version",
  "token_id",
  "version",
] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const ORDER_PATTERN = /^odr_[0-9a-f]{32}$/;
const TOKEN_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{3,200}$/;
const MAX_TOKEN_AGE_MS = 15 * 60 * 1000;
const MAX_TOKEN_LENGTH = 4096;

function parseCanonicalTime(value: unknown): number {
  if (typeof value !== "string") throw new Error("Ops teardown access denied");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("Ops teardown access denied");
  }
  return parsed;
}

function requireSigningSecret(secret: string): string {
  const normalized = secret.trim();
  if (normalized.length < 32) throw new Error("Ops teardown access unavailable");
  return normalized;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", requireSigningSecret(secret)).update(payload).digest("base64url");
}

function assertPaidBinding(order: OpsDragOrder): void {
  const payment = order.payment;
  if (!payment || payment.refundReason || payment.amountTotal !== 2_900 || payment.currency !== "usd") {
    throw new Error("Ops teardown access unavailable");
  }
  try {
    assertOpsDragAdmittedSnapshotIntegrity(order.snapshot);
  } catch {
    throw new Error("Ops teardown access unavailable");
  }
  if (
    order.submission_id !== order.snapshot.submission_id ||
    order.snapshot.report_input.leadId !== order.submission_id ||
    order.snapshot.digest !== payment.snapshotDigest ||
    order.snapshot.digest_contract_version !== payment.snapshotDigestVersion ||
    sha256(order.snapshot.delivery_email.trim().toLowerCase()) !== payment.customerEmailSha256
  ) {
    throw new Error("Ops teardown access unavailable");
  }
}

export function createOpsTeardownAccessToken(input: {
  order: OpsDragOrder;
  purpose: OpsTeardownAccessPurpose;
  tokenId: string;
  issuedAt: string;
  expiresAt: string;
  secret: string;
}): string {
  assertPaidBinding(input.order);
  if (!TOKEN_ID_PATTERN.test(input.tokenId)) throw new Error("Ops teardown token identifier is invalid");
  const issuedAt = parseCanonicalTime(input.issuedAt);
  const expiresAt = parseCanonicalTime(input.expiresAt);
  if (expiresAt <= issuedAt || expiresAt - issuedAt > MAX_TOKEN_AGE_MS) {
    throw new Error("Ops teardown token lifetime is invalid");
  }
  const payment = input.order.payment!;
  const claims: OpsTeardownAccessClaims = {
    version: "v1",
    purpose: input.purpose,
    token_id: input.tokenId,
    lead_id: input.order.submission_id,
    order_id: input.order.order_id,
    checkout_session_id: payment.checkoutSessionId,
    payment_reference_id: payment.paymentReferenceId,
    snapshot_digest: input.order.snapshot.digest,
    snapshot_digest_version: input.order.snapshot.digest_contract_version,
    recipient_sha256: payment.customerEmailSha256,
    issued_at: input.issuedAt,
    expires_at: input.expiresAt,
  };
  const payload = Buffer.from(canonicalJson(claims), "utf8").toString("base64url");
  return `v1.${payload}.${signPayload(payload, input.secret)}`;
}

export function verifyOpsTeardownAccessToken(input: {
  authorization: string | null;
  expectedPurpose: OpsTeardownAccessPurpose;
  recordedAt: string;
  secret: string;
}): OpsTeardownAccessClaims {
  requireSigningSecret(input.secret);
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(input.authorization ?? "");
  const token = match?.[1] ?? "";
  if (!token || token.length > MAX_TOKEN_LENGTH) throw new Error("Ops teardown access denied");
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Ops teardown access denied");
  const expected = Buffer.from(signPayload(parts[1], input.secret), "utf8");
  const supplied = Buffer.from(parts[2], "utf8");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Ops teardown access denied");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Ops teardown access denied");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Ops teardown access denied");
  }
  const claims = parsed as Partial<OpsTeardownAccessClaims>;
  if (
    Object.keys(claims).sort().join("|") !== [...CLAIM_KEYS].sort().join("|") ||
    claims.version !== "v1" ||
    claims.purpose !== input.expectedPurpose ||
    !TOKEN_ID_PATTERN.test(claims.token_id ?? "") ||
    !UUID_PATTERN.test(claims.lead_id ?? "") ||
    !ORDER_PATTERN.test(claims.order_id ?? "") ||
    !PROVIDER_ID_PATTERN.test(claims.checkout_session_id ?? "") ||
    !PROVIDER_ID_PATTERN.test(claims.payment_reference_id ?? "") ||
    !HASH_PATTERN.test(claims.snapshot_digest ?? "") ||
    claims.snapshot_digest_version !== OPS_DRAG_SNAPSHOT_DIGEST_VERSION ||
    !HASH_PATTERN.test(claims.recipient_sha256 ?? "")
  ) {
    throw new Error("Ops teardown access denied");
  }
  const issuedAt = parseCanonicalTime(claims.issued_at);
  const expiresAt = parseCanonicalTime(claims.expires_at);
  const recordedAt = parseCanonicalTime(input.recordedAt);
  if (
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > MAX_TOKEN_AGE_MS ||
    recordedAt < issuedAt ||
    recordedAt > expiresAt
  ) {
    throw new Error("Ops teardown access denied");
  }
  return claims as OpsTeardownAccessClaims;
}

export function assertOpsTeardownOrderBinding(order: OpsDragOrder, claims: OpsTeardownAccessClaims): string {
  try {
    assertPaidBinding(order);
  } catch {
    throw new Error("Ops teardown access denied");
  }
  const payment = order.payment!;
  const recipient = order.snapshot.delivery_email.trim().toLowerCase();
  if (
    order.submission_id !== claims.lead_id ||
    order.order_id !== claims.order_id ||
    payment.checkoutSessionId !== claims.checkout_session_id ||
    payment.paymentReferenceId !== claims.payment_reference_id ||
    order.snapshot.digest !== claims.snapshot_digest ||
    order.snapshot.digest_contract_version !== claims.snapshot_digest_version ||
    payment.customerEmailSha256 !== claims.recipient_sha256 ||
    sha256(recipient) !== claims.recipient_sha256
  ) {
    throw new Error("Ops teardown access denied");
  }
  return recipient;
}
