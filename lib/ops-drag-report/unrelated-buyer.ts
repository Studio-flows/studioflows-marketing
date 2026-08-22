import { createHmac } from "node:crypto";

import { canonicalJson, sha256 } from "./order-foundation.ts";

export const UNRELATED_BUYER_METHOD_VERSION = "ops_drag_unrelated_buyer_hmac_v1" as const;

export type EligibilityResult = "PASS" | "FAIL" | "UNVERIFIED";
export type EligibilitySourceName =
  | "DIRECTORY_TEAM_TEST"
  | "EXISTING_CUSTOMERS_PRIOR_BUYERS"
  | "CRM"
  | "INTERNAL_PACKAGES_REFUNDED_TESTS"
  | "PAYMENT_FINGERPRINTS";

export type EligibilitySourceReceipt = {
  source: EligibilitySourceName;
  freshness_receipt_hash: string;
  coverage_receipt_hash: string;
};

export type EligibilityReceipt = {
  method_version: typeof UNRELATED_BUYER_METHOD_VERSION;
  result: EligibilityResult;
  evidence_hash: string;
  source_receipts: EligibilitySourceReceipt[];
  blocker_code: string | null;
};

export type EligibilitySourceAdapter = {
  name: EligibilitySourceName;
  check(input: {
    candidateDigests: readonly string[];
    evaluatedAt: string;
  }): Promise<{
    available: boolean;
    fresh: boolean;
    coverageComplete: boolean;
    matched: boolean;
    freshnessReceiptHash: string;
    coverageReceiptHash: string;
  }>;
};

const REQUIRED_SOURCES: readonly EligibilitySourceName[] = [
  "DIRECTORY_TEAM_TEST",
  "EXISTING_CUSTOMERS_PRIOR_BUYERS",
  "CRM",
  "INTERNAL_PACKAGES_REFUNDED_TESTS",
  "PAYMENT_FINGERPRINTS",
];

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}

function digestIdentifier(identifier: string, secret: string): string {
  return createHmac("sha256", secret).update(`${UNRELATED_BUYER_METHOD_VERSION}|${identifier}`).digest("hex");
}

function unverified(blockerCode: string, sourceReceipts: EligibilitySourceReceipt[] = []): EligibilityReceipt {
  const evidence = {
    method_version: UNRELATED_BUYER_METHOD_VERSION,
    result: "UNVERIFIED" as const,
    source_receipts: sourceReceipts,
    blocker_code: blockerCode,
  };
  return { ...evidence, evidence_hash: sha256(canonicalJson(evidence)) };
}

export async function evaluateUnrelatedBuyer(input: {
  identifiers: readonly string[];
  hmacSecret: string | undefined;
  sources: readonly EligibilitySourceAdapter[];
  evaluatedAt: string;
}): Promise<EligibilityReceipt> {
  if (!input.hmacSecret || input.hmacSecret.length < 32) return unverified("ELIGIBILITY_HMAC_SECRET_UNAVAILABLE");
  const normalized = [...new Set(input.identifiers.map(normalizeIdentifier).filter(Boolean))];
  if (normalized.length === 0) return unverified("ELIGIBILITY_IDENTIFIERS_UNAVAILABLE");
  const byName = new Map(input.sources.map((source) => [source.name, source]));
  if (REQUIRED_SOURCES.some((source) => !byName.has(source))) return unverified("ELIGIBILITY_SOURCE_MISSING");

  const candidateDigests = normalized.map((identifier) => digestIdentifier(identifier, input.hmacSecret!));
  const results = await Promise.all(
    REQUIRED_SOURCES.map(async (name) => ({ name, result: await byName.get(name)!.check({ candidateDigests, evaluatedAt: input.evaluatedAt }) }))
  );
  const sourceReceipts = results.map(({ name, result }) => ({
    source: name,
    freshness_receipt_hash: result.freshnessReceiptHash,
    coverage_receipt_hash: result.coverageReceiptHash,
  }));
  const unavailable = results.find(({ result }) => !result.available);
  if (unavailable) return unverified(`ELIGIBILITY_SOURCE_UNAVAILABLE:${unavailable.name}`, sourceReceipts);
  const stale = results.find(({ result }) => !result.fresh);
  if (stale) return unverified(`ELIGIBILITY_SOURCE_STALE:${stale.name}`, sourceReceipts);
  const incomplete = results.find(({ result }) => !result.coverageComplete);
  if (incomplete) return unverified(`ELIGIBILITY_COVERAGE_INCOMPLETE:${incomplete.name}`, sourceReceipts);

  const result: EligibilityResult = results.some(({ result: sourceResult }) => sourceResult.matched) ? "FAIL" : "PASS";
  const evidence = {
    method_version: UNRELATED_BUYER_METHOD_VERSION,
    result,
    source_receipts: sourceReceipts,
    blocker_code: null,
    source_match_vector: results.map(({ name, result: sourceResult }) => ({ source: name, matched: sourceResult.matched })),
  };
  return {
    method_version: UNRELATED_BUYER_METHOD_VERSION,
    result,
    evidence_hash: sha256(canonicalJson(evidence)),
    source_receipts: sourceReceipts,
    blocker_code: null,
  };
}

export function eligibilityReceiptContainsRawIdentifier(receipt: EligibilityReceipt, identifiers: readonly string[]): boolean {
  const serialized = canonicalJson(receipt).toLowerCase();
  return identifiers.some((identifier) => serialized.includes(normalizeIdentifier(identifier)));
}
