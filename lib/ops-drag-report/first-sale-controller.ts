import { createHmac } from "node:crypto";

import { acceptedSourceConfigurationHash, OPS_DRAG_ACCEPTED_SOURCE_HASHES } from "./accepted-contract.ts";
import { countsAsVerifiedFirstSale } from "./delivery-refund-state-machine.ts";
import { canonicalJson, sha256, type OpsDragOrder } from "./order-foundation.ts";
import type { EligibilityReceipt } from "./unrelated-buyer.ts";

export const OPS_DRAG_OFFER_VERSION = "ops_drag_report_29_usd_one_time_v1" as const;
export const ACQUISITION_CONTROL_VERSION = "ops_drag_search_v1" as const;
export const FIRST_SALE_ORDER_DIGEST_METHOD_VERSION = "ops_drag_order_hmac_v1" as const;
export const ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS = 500 as const;
export const ACQUISITION_DAILY_BILLED_CAP_CENTS = 1_000 as const;
export const ACQUISITION_PAUSE_THRESHOLD_CENTS = 9_000 as const;
export const ACQUISITION_TOTAL_CAP_CENTS = 10_000 as const;
export const ACQUISITION_FIXED_FLIGHT_DAYS = 10 as const;

const CAMPAIGN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,62}[a-z0-9])?$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

export type FirstSaleCandidate = {
  order: OpsDragOrder;
  offerVersion: typeof OPS_DRAG_OFFER_VERSION | string;
  paymentMode: "test" | "live";
  paymentSettled: boolean;
  reportValidation: "PASS" | "FAIL";
  country: string;
  unrelatedBuyer: EligibilityReceipt;
  humanTouchesNormalPath: number;
  sourceHashes: Record<keyof typeof OPS_DRAG_ACCEPTED_SOURCE_HASHES, string>;
  configHashesCurrent: boolean;
  dispute: boolean;
  testMarker: boolean;
  renewalMarker: boolean;
  internalPackageMarker: boolean;
  acquisitionSource: "OPS_DRAG_SEARCH_V1" | "UNATTRIBUTED";
};

export type FirstSaleAssessment = {
  result: "PASS" | "FAIL";
  blocker_codes: string[];
  order_digest: string | null;
  order_digest_method_version: typeof FIRST_SALE_ORDER_DIGEST_METHOD_VERSION;
  evidence_hash: string;
};

function validCampaignId(value: unknown): value is string {
  return typeof value === "string" && CAMPAIGN_ID_PATTERN.test(value);
}

function validDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}

export function createFirstSaleOrderDigest(orderId: string, hmacSecret: string): string {
  if (typeof hmacSecret !== "string" || hmacSecret.length < 32) {
    throw new Error("First-sale order digest configuration is unavailable");
  }
  return createHmac("sha256", hmacSecret)
    .update(`${FIRST_SALE_ORDER_DIGEST_METHOD_VERSION}|${orderId}`)
    .digest("hex");
}

export function assessFirstSaleCandidate(candidate: FirstSaleCandidate, orderDigestSecret: string): FirstSaleAssessment {
  const blockers: string[] = [];
  let orderDigest: string | null = null;
  try {
    orderDigest = createFirstSaleOrderDigest(candidate.order.order_id, orderDigestSecret);
  } catch {
    blockers.push("ORDER_DIGEST_SECRET_UNAVAILABLE");
  }
  if (candidate.offerVersion !== OPS_DRAG_OFFER_VERSION) blockers.push("OFFER_VERSION_MISMATCH");
  if (candidate.paymentMode !== "live") blockers.push("PAYMENT_NOT_LIVE");
  if (!candidate.paymentSettled) blockers.push("PAYMENT_NOT_SETTLED");
  if (!candidate.order.payment || candidate.order.payment.amountTotal !== 2_900 || candidate.order.payment.currency !== "usd") blockers.push("PAYMENT_OFFER_MISMATCH");
  if (!countsAsVerifiedFirstSale(candidate.order)) blockers.push("DELIVERY_NOT_PROVIDER_CONFIRMED");
  if (candidate.reportValidation !== "PASS") blockers.push("REPORT_VALIDATION_NOT_PASS");
  if (candidate.country.trim().toUpperCase() !== "US") blockers.push("BUYER_NOT_US");
  if (candidate.unrelatedBuyer.result !== "PASS") blockers.push(`UNRELATED_BUYER_${candidate.unrelatedBuyer.result}`);
  if (candidate.humanTouchesNormalPath !== 0) blockers.push("HUMAN_TOUCH_PRESENT");
  const expectedHash = acceptedSourceConfigurationHash();
  const actualHash = sha256(canonicalJson(candidate.sourceHashes));
  if (actualHash !== expectedHash || !candidate.configHashesCurrent) blockers.push("ACCEPTED_HASH_DRIFT");
  if (candidate.dispute) blockers.push("DISPUTE_PRESENT");
  if (candidate.testMarker) blockers.push("TEST_MARKER_PRESENT");
  if (candidate.renewalMarker) blockers.push("RENEWAL_MARKER_PRESENT");
  if (candidate.internalPackageMarker) blockers.push("INTERNAL_PACKAGE_MARKER_PRESENT");
  if (candidate.acquisitionSource !== "OPS_DRAG_SEARCH_V1") blockers.push("ACQUISITION_SOURCE_NOT_PERMITTED");
  const evidence = {
    result: blockers.length === 0 ? "PASS" : "FAIL",
    blocker_codes: blockers,
    order_digest: orderDigest,
    order_digest_method_version: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
  } as const;
  return { ...evidence, result: evidence.result as "PASS" | "FAIL", evidence_hash: sha256(canonicalJson(evidence)) };
}

export type FirstSaleControlState = {
  version: "v2";
  status: "OPEN" | "FIRST_SALE_ELIGIBLE" | "FIRST_SALE_VERIFIED";
  eligible_order_digest: string | null;
  order_digest_method_version: typeof FIRST_SALE_ORDER_DIGEST_METHOD_VERSION | null;
  stop_request_owner: string | null;
  campaign_id: string | null;
  campaign_config_hash: string | null;
  pause_idempotency_key: string | null;
  pause_readback_hash: string | null;
};

export function createFirstSaleControlState(): FirstSaleControlState {
  return {
    version: "v2",
    status: "OPEN",
    eligible_order_digest: null,
    order_digest_method_version: null,
    stop_request_owner: null,
    campaign_id: null,
    campaign_config_hash: null,
    pause_idempotency_key: null,
    pause_readback_hash: null,
  };
}

export function createAcceptedAcquisitionConfigHash(campaignId: string): string {
  if (!validCampaignId(campaignId)) throw new Error("Acquisition campaign configuration is invalid");
  return sha256(canonicalJson({
    version: ACQUISITION_CONTROL_VERSION,
    channel: "GOOGLE_SEARCH",
    campaign_id: campaignId,
    average_daily_budget_cents: ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS,
    daily_billed_cap_cents: ACQUISITION_DAILY_BILLED_CAP_CENTS,
    pause_threshold_cents: ACQUISITION_PAUSE_THRESHOLD_CENTS,
    total_cap_cents: ACQUISITION_TOTAL_CAP_CENTS,
    fixed_flight_days: ACQUISITION_FIXED_FLIGHT_DAYS,
    accepted_source_configuration_hash: acceptedSourceConfigurationHash(),
  }));
}

export function createPauseIdempotencyKey(campaignId: string, orderDigest: string): string {
  if (!validCampaignId(campaignId) || !validDigest(orderDigest)) throw new Error("Campaign pause binding is invalid");
  return `ops-drag:${campaignId}:${orderDigest}:pause:first-sale:v1`;
}

export function claimFirstSaleEligible(
  state: FirstSaleControlState,
  candidate: FirstSaleCandidate,
  campaignId: string,
  campaignConfigHash: string,
  orderDigestSecret: string
): { disposition: "acquired" | "duplicate" | "rejected"; state: FirstSaleControlState; assessment: FirstSaleAssessment } {
  const assessment = assessFirstSaleCandidate(candidate, orderDigestSecret);
  if (assessment.result !== "PASS" || !assessment.order_digest || !validCampaignId(campaignId)) return { disposition: "rejected", state, assessment };
  let expectedCampaignConfigHash: string;
  try {
    expectedCampaignConfigHash = createAcceptedAcquisitionConfigHash(campaignId);
  } catch {
    return { disposition: "rejected", state, assessment };
  }
  if (campaignConfigHash !== expectedCampaignConfigHash) return { disposition: "rejected", state, assessment };
  if (state.status !== "OPEN") return { disposition: "duplicate", state, assessment };
  const owner = `fst_${sha256(`${assessment.order_digest}|${assessment.evidence_hash}|v2`).slice(0, 32)}`;
  return {
    disposition: "acquired",
    assessment,
    state: {
      ...state,
      status: "FIRST_SALE_ELIGIBLE",
      eligible_order_digest: assessment.order_digest,
      order_digest_method_version: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
      stop_request_owner: owner,
      campaign_id: campaignId,
      campaign_config_hash: campaignConfigHash,
      pause_idempotency_key: createPauseIdempotencyKey(campaignId, assessment.order_digest),
    },
  };
}

export type FirstSaleControlStore = {
  read(): Promise<{ state: FirstSaleControlState; revision: string }>;
  compareAndSwap(expectedRevision: string, next: FirstSaleControlState): Promise<boolean>;
};

export async function claimFirstSaleEligibleAtomically(
  store: FirstSaleControlStore,
  candidate: FirstSaleCandidate,
  campaignId: string,
  campaignConfigHash: string,
  orderDigestSecret: string
): Promise<{ disposition: "acquired" | "duplicate" | "rejected"; state: FirstSaleControlState; assessment: FirstSaleAssessment }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.read();
    const transition = claimFirstSaleEligible(current.state, candidate, campaignId, campaignConfigHash, orderDigestSecret);
    if (transition.disposition !== "acquired") return transition;
    if (await store.compareAndSwap(current.revision, transition.state)) return transition;
  }
  throw new Error("First-sale eligibility lost its atomic update budget");
}

export type CampaignPauseReadback = {
  orderDigest: unknown;
  orderDigestMethodVersion: unknown;
  campaignId: unknown;
  campaignConfigHash: unknown;
  idempotencyKey: unknown;
  providerState: unknown;
  readbackCampaignId: unknown;
  readbackIdempotencyKey: unknown;
  readbackHash: unknown;
};

export function acceptCampaignPauseReadback(state: FirstSaleControlState, input: CampaignPauseReadback): FirstSaleControlState {
  if (input.providerState !== "PAUSED") throw new Error("Campaign pause provider state is not accepted");
  if (
    !validDigest(input.orderDigest) ||
    input.orderDigestMethodVersion !== FIRST_SALE_ORDER_DIGEST_METHOD_VERSION ||
    !validCampaignId(input.campaignId) ||
    input.campaignId !== input.readbackCampaignId ||
    input.campaignConfigHash !== createAcceptedAcquisitionConfigHash(input.campaignId) ||
    typeof input.idempotencyKey !== "string" ||
    input.idempotencyKey !== input.readbackIdempotencyKey ||
    input.idempotencyKey !== createPauseIdempotencyKey(input.campaignId, input.orderDigest) ||
    typeof input.readbackHash !== "string" ||
    !input.readbackHash.trim()
  ) throw new Error("Campaign pause readback binding failed");
  if (
    state.status === "FIRST_SALE_VERIFIED" &&
    state.eligible_order_digest === input.orderDigest &&
    state.campaign_id === input.campaignId &&
    state.pause_idempotency_key === input.idempotencyKey &&
    state.pause_readback_hash === input.readbackHash
  ) return state;
  if (
    state.status !== "FIRST_SALE_ELIGIBLE" ||
    state.eligible_order_digest !== input.orderDigest ||
    state.order_digest_method_version !== input.orderDigestMethodVersion ||
    state.campaign_id !== input.campaignId ||
    state.campaign_config_hash !== input.campaignConfigHash ||
    state.pause_idempotency_key !== input.idempotencyKey
  ) throw new Error("Campaign pause readback binding failed");
  return { ...state, status: "FIRST_SALE_VERIFIED", pause_readback_hash: input.readbackHash };
}

export type AcquisitionSnapshot = {
  channel: "GOOGLE_SEARCH";
  campaignId: string;
  acceptedCampaignConfigHash: string;
  campaignState: "PAUSED" | "ENABLED";
  averageDailyBudgetCents: number;
  currentDayBilledSpendCents: number;
  cumulativeBilledSpendCents: number;
  acceptedResidualExposureCents: number | null;
  residualExposureReceiptCurrent: boolean;
  flightStartedAt: string;
  now: string;
  launchHashesCurrent: boolean;
  deliveryConfigFailure: boolean;
  privacySecurityCustomerHarm: boolean;
  checkoutStarts: number;
  completedChecks: number;
  providerSpendReceiptPresent: boolean;
};

export type AcquisitionStopCode =
  | "FIRST_SALE_ELIGIBLE"
  | "DAILY_BILLED_CAP"
  | "CUMULATIVE_PAUSE_THRESHOLD"
  | "ABSOLUTE_TOTAL_CAP"
  | "FIXED_FLIGHT_ENDED"
  | "LAUNCH_HASH_DRIFT"
  | "DELIVERY_OR_CONFIG_FAILURE"
  | "PRIVACY_SECURITY_CUSTOMER_HARM"
  | "FIFTY_DOLLARS_ZERO_CHECKOUT_STARTS"
  | "FIVE_CHECKS_ZERO_CHECKOUT_STARTS"
  | "SPEND_RECEIPT_UNVERIFIED";

function flightEnded(snapshot: AcquisitionSnapshot): boolean {
  const start = Date.parse(snapshot.flightStartedAt);
  const now = Date.parse(snapshot.now);
  if (!Number.isFinite(start) || !Number.isFinite(now)) throw new Error("Acquisition flight timestamps are invalid");
  return now >= start + ACQUISITION_FIXED_FLIGHT_DAYS * 86_400_000;
}

export function evaluateAcquisitionStops(snapshot: AcquisitionSnapshot, firstSaleEligible: boolean): AcquisitionStopCode[] {
  const codes: AcquisitionStopCode[] = [];
  if (firstSaleEligible) codes.push("FIRST_SALE_ELIGIBLE");
  if (!snapshot.providerSpendReceiptPresent && (snapshot.currentDayBilledSpendCents > 0 || snapshot.cumulativeBilledSpendCents > 0)) codes.push("SPEND_RECEIPT_UNVERIFIED");
  if (snapshot.currentDayBilledSpendCents >= ACQUISITION_DAILY_BILLED_CAP_CENTS) codes.push("DAILY_BILLED_CAP");
  if (snapshot.cumulativeBilledSpendCents >= ACQUISITION_TOTAL_CAP_CENTS) codes.push("ABSOLUTE_TOTAL_CAP");
  if (snapshot.cumulativeBilledSpendCents >= ACQUISITION_PAUSE_THRESHOLD_CENTS) codes.push("CUMULATIVE_PAUSE_THRESHOLD");
  if (flightEnded(snapshot)) codes.push("FIXED_FLIGHT_ENDED");
  if (!snapshot.launchHashesCurrent) codes.push("LAUNCH_HASH_DRIFT");
  if (snapshot.deliveryConfigFailure) codes.push("DELIVERY_OR_CONFIG_FAILURE");
  if (snapshot.privacySecurityCustomerHarm) codes.push("PRIVACY_SECURITY_CUSTOMER_HARM");
  if (snapshot.cumulativeBilledSpendCents >= 5_000 && snapshot.checkoutStarts === 0) codes.push("FIFTY_DOLLARS_ZERO_CHECKOUT_STARTS");
  if (snapshot.completedChecks >= 5 && snapshot.checkoutStarts === 0) codes.push("FIVE_CHECKS_ZERO_CHECKOUT_STARTS");
  return [...new Set(codes)];
}

export type AcquisitionPauseProviderResult = {
  providerState: unknown;
  campaignId: unknown;
  orderDigest: unknown;
  idempotencyKey: unknown;
  readbackHash: unknown;
};

export type AcquisitionPauseTransport = {
  pause(input: { campaignId: string; orderDigest: string; idempotencyKey: string; stopCodes: readonly AcquisitionStopCode[] }): Promise<AcquisitionPauseProviderResult>;
};

export type AcquisitionPauseAdapter = {
  campaignId: string;
  campaignConfigHash: string;
  pause: AcquisitionPauseTransport["pause"];
};

export function createAcquisitionPauseAdapter(input: {
  enabled: boolean;
  channel: "GOOGLE_SEARCH";
  campaignId: string;
  acceptedCampaignConfigHash: string;
  averageDailyBudgetCents: number;
  acceptedResidualExposureCents: number | null;
  residualExposureReceiptCurrent: boolean;
  transport: AcquisitionPauseTransport;
}): AcquisitionPauseAdapter {
  if (!input.enabled) throw new Error("Acquisition pause adapter is disabled");
  if (input.channel !== "GOOGLE_SEARCH" || !validCampaignId(input.campaignId)) throw new Error("Acquisition campaign is not configured");
  const expectedConfigHash = createAcceptedAcquisitionConfigHash(input.campaignId);
  if (input.acceptedCampaignConfigHash !== expectedConfigHash) throw new Error("Acquisition campaign configuration hash is not accepted");
  if (input.averageDailyBudgetCents !== ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS) throw new Error("Acquisition average daily budget must be $5.00");
  if (input.acceptedResidualExposureCents === null || input.acceptedResidualExposureCents > 1_000 || !input.residualExposureReceiptCurrent) {
    throw new Error("Acquisition residual exposure is not currently accepted at or below $10.00");
  }
  return { campaignId: input.campaignId, campaignConfigHash: expectedConfigHash, pause: input.transport.pause.bind(input.transport) };
}

export async function requestAcquisitionPause(input: {
  adapter: AcquisitionPauseAdapter;
  snapshot: AcquisitionSnapshot;
  orderDigest: string;
  stopCodes: readonly AcquisitionStopCode[];
}): Promise<{ providerState: "PAUSED"; campaignId: string; orderDigest: string; idempotencyKey: string; readbackHash: string }> {
  if (input.stopCodes.length === 0) throw new Error("Acquisition pause requires a stop condition");
  if (
    !validDigest(input.orderDigest) ||
    !validCampaignId(input.snapshot.campaignId) ||
    input.snapshot.campaignId !== input.adapter.campaignId ||
    input.snapshot.acceptedCampaignConfigHash !== input.adapter.campaignConfigHash ||
    input.snapshot.acceptedCampaignConfigHash !== createAcceptedAcquisitionConfigHash(input.snapshot.campaignId) ||
    input.snapshot.averageDailyBudgetCents !== ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS ||
    input.snapshot.acceptedResidualExposureCents === null ||
    input.snapshot.acceptedResidualExposureCents > 1_000 ||
    !input.snapshot.residualExposureReceiptCurrent
  ) throw new Error("Acquisition pause request binding failed");
  const idempotencyKey = createPauseIdempotencyKey(input.adapter.campaignId, input.orderDigest);
  const result = await input.adapter.pause({ campaignId: input.adapter.campaignId, orderDigest: input.orderDigest, idempotencyKey, stopCodes: input.stopCodes });
  if (result.providerState !== "PAUSED") throw new Error("Campaign pause provider state is not accepted");
  if (
    result.campaignId !== input.adapter.campaignId ||
    result.orderDigest !== input.orderDigest ||
    result.idempotencyKey !== idempotencyKey ||
    typeof result.readbackHash !== "string" ||
    !result.readbackHash.trim()
  ) throw new Error("Campaign pause provider readback binding failed");
  return { providerState: "PAUSED", campaignId: input.adapter.campaignId, orderDigest: input.orderDigest, idempotencyKey, readbackHash: result.readbackHash };
}
