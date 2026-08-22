import { acceptedSourceConfigurationHash, OPS_DRAG_ACCEPTED_SOURCE_HASHES } from "./accepted-contract.ts";
import { countsAsVerifiedFirstSale } from "./delivery-refund-state-machine.ts";
import { canonicalJson, sha256, type OpsDragOrder } from "./order-foundation.ts";
import type { EligibilityReceipt } from "./unrelated-buyer.ts";

export const OPS_DRAG_OFFER_VERSION = "ops_drag_report_29_usd_one_time_v1" as const;
export const ACQUISITION_CONTROL_VERSION = "ops_drag_search_v1" as const;
export const ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS = 500 as const;
export const ACQUISITION_DAILY_BILLED_CAP_CENTS = 1_000 as const;
export const ACQUISITION_PAUSE_THRESHOLD_CENTS = 9_000 as const;
export const ACQUISITION_TOTAL_CAP_CENTS = 10_000 as const;
export const ACQUISITION_FIXED_FLIGHT_DAYS = 10 as const;

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
  evidence_hash: string;
};

export function assessFirstSaleCandidate(candidate: FirstSaleCandidate): FirstSaleAssessment {
  const blockers: string[] = [];
  if (candidate.offerVersion !== OPS_DRAG_OFFER_VERSION) blockers.push("OFFER_VERSION_MISMATCH");
  if (candidate.paymentMode !== "live") blockers.push("PAYMENT_NOT_LIVE");
  if (!candidate.paymentSettled) blockers.push("PAYMENT_NOT_SETTLED");
  if (!candidate.order.payment || candidate.order.payment.amountTotal !== 2_900 || candidate.order.payment.currency !== "usd") {
    blockers.push("PAYMENT_OFFER_MISMATCH");
  }
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
  const evidence = { result: blockers.length === 0 ? "PASS" : "FAIL", blocker_codes: blockers, order_id: candidate.order.order_id };
  return { ...evidence, result: evidence.result as "PASS" | "FAIL", evidence_hash: sha256(canonicalJson(evidence)) };
}

export type FirstSaleControlState = {
  version: "v1";
  status: "OPEN" | "FIRST_SALE_ELIGIBLE" | "FIRST_SALE_VERIFIED";
  eligible_order_id: string | null;
  stop_request_owner: string | null;
  pause_idempotency_key: string | null;
  pause_readback_hash: string | null;
};

export function createFirstSaleControlState(): FirstSaleControlState {
  return {
    version: "v1",
    status: "OPEN",
    eligible_order_id: null,
    stop_request_owner: null,
    pause_idempotency_key: null,
    pause_readback_hash: null,
  };
}

export function createPauseIdempotencyKey(campaignId: string): string {
  if (!campaignId.trim()) throw new Error("Campaign ID is required");
  return `ops-drag:${campaignId}:pause:first-sale:v1`;
}

export function claimFirstSaleEligible(
  state: FirstSaleControlState,
  candidate: FirstSaleCandidate,
  campaignId: string
): { disposition: "acquired" | "duplicate" | "rejected"; state: FirstSaleControlState; assessment: FirstSaleAssessment } {
  const assessment = assessFirstSaleCandidate(candidate);
  if (assessment.result !== "PASS") return { disposition: "rejected", state, assessment };
  if (state.status !== "OPEN") return { disposition: "duplicate", state, assessment };
  const owner = `fst_${sha256(`${candidate.order.order_id}|${assessment.evidence_hash}|v1`).slice(0, 32)}`;
  return {
    disposition: "acquired",
    assessment,
    state: {
      ...state,
      status: "FIRST_SALE_ELIGIBLE",
      eligible_order_id: candidate.order.order_id,
      stop_request_owner: owner,
      pause_idempotency_key: createPauseIdempotencyKey(campaignId),
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
  campaignId: string
): Promise<{ disposition: "acquired" | "duplicate" | "rejected"; state: FirstSaleControlState; assessment: FirstSaleAssessment }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.read();
    const transition = claimFirstSaleEligible(current.state, candidate, campaignId);
    if (transition.disposition !== "acquired") return transition;
    if (await store.compareAndSwap(current.revision, transition.state)) return transition;
  }
  throw new Error("First-sale eligibility lost its atomic update budget");
}

export function acceptCampaignPauseReadback(
  state: FirstSaleControlState,
  input: { orderId: string; idempotencyKey: string; providerState: "PAUSED"; readbackHash: string }
): FirstSaleControlState {
  if (state.status === "FIRST_SALE_VERIFIED") return state;
  if (
    state.status !== "FIRST_SALE_ELIGIBLE" ||
    state.eligible_order_id !== input.orderId ||
    state.pause_idempotency_key !== input.idempotencyKey ||
    !input.readbackHash.trim()
  ) {
    throw new Error("Campaign pause readback binding failed");
  }
  return { ...state, status: "FIRST_SALE_VERIFIED", pause_readback_hash: input.readbackHash };
}

export type AcquisitionSnapshot = {
  channel: "GOOGLE_SEARCH";
  campaignId: string;
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
  if (!snapshot.providerSpendReceiptPresent && (snapshot.currentDayBilledSpendCents > 0 || snapshot.cumulativeBilledSpendCents > 0)) {
    codes.push("SPEND_RECEIPT_UNVERIFIED");
  }
  if (snapshot.currentDayBilledSpendCents >= ACQUISITION_DAILY_BILLED_CAP_CENTS) codes.push("DAILY_BILLED_CAP");
  if (snapshot.cumulativeBilledSpendCents >= ACQUISITION_TOTAL_CAP_CENTS) codes.push("ABSOLUTE_TOTAL_CAP");
  if (snapshot.cumulativeBilledSpendCents >= ACQUISITION_PAUSE_THRESHOLD_CENTS) codes.push("CUMULATIVE_PAUSE_THRESHOLD");
  if (flightEnded(snapshot)) codes.push("FIXED_FLIGHT_ENDED");
  if (!snapshot.launchHashesCurrent) codes.push("LAUNCH_HASH_DRIFT");
  if (snapshot.deliveryConfigFailure) codes.push("DELIVERY_OR_CONFIG_FAILURE");
  if (snapshot.privacySecurityCustomerHarm) codes.push("PRIVACY_SECURITY_CUSTOMER_HARM");
  if (snapshot.cumulativeBilledSpendCents >= 5_000 && snapshot.checkoutStarts === 0) {
    codes.push("FIFTY_DOLLARS_ZERO_CHECKOUT_STARTS");
  }
  if (snapshot.completedChecks >= 5 && snapshot.checkoutStarts === 0) codes.push("FIVE_CHECKS_ZERO_CHECKOUT_STARTS");
  return [...new Set(codes)];
}

export type AcquisitionPauseAdapter = {
  pause(input: { campaignId: string; idempotencyKey: string; stopCodes: readonly AcquisitionStopCode[] }): Promise<{
    providerState: "PAUSED";
    readbackHash: string;
  }>;
};

export function createAcquisitionPauseAdapter(input: {
  enabled: boolean;
  channel: "GOOGLE_SEARCH";
  campaignId: string;
  averageDailyBudgetCents: number;
  acceptedResidualExposureCents: number | null;
  residualExposureReceiptCurrent: boolean;
  transport: AcquisitionPauseAdapter;
}): AcquisitionPauseAdapter {
  if (!input.enabled) throw new Error("Acquisition pause adapter is disabled");
  if (!input.campaignId.trim()) throw new Error("Acquisition campaign is not configured");
  if (input.averageDailyBudgetCents !== ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS) {
    throw new Error("Acquisition average daily budget must be $5.00");
  }
  if (
    input.acceptedResidualExposureCents === null ||
    input.acceptedResidualExposureCents > 1_000 ||
    !input.residualExposureReceiptCurrent
  ) {
    throw new Error("Acquisition residual exposure is not currently accepted at or below $10.00");
  }
  return input.transport;
}

export async function requestAcquisitionPause(input: {
  adapter: AcquisitionPauseAdapter;
  snapshot: AcquisitionSnapshot;
  stopCodes: readonly AcquisitionStopCode[];
}): Promise<{ providerState: "PAUSED"; readbackHash: string; idempotencyKey: string }> {
  if (input.stopCodes.length === 0) throw new Error("Acquisition pause requires a stop condition");
  const idempotencyKey = createPauseIdempotencyKey(input.snapshot.campaignId);
  const result = await input.adapter.pause({ campaignId: input.snapshot.campaignId, idempotencyKey, stopCodes: input.stopCodes });
  return { ...result, idempotencyKey };
}
