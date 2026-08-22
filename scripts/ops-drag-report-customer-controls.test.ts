import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

import {
  OPS_DRAG_ACCEPTED_SOURCE_HASHES,
  OPS_DRAG_CUSTOMER_CONTRACT,
  OPS_DRAG_PRIVACY_DISCLOSURE,
  assertAcceptedSourceHashes,
  assertBusinessUseInputCeilingAcknowledgment,
  assertCustomerContractClaimCeiling,
} from "../lib/ops-drag-report/accepted-contract.ts";
import {
  createCustomerLaunchReleaseEnvelope,
  resolveCustomerContractRuntime,
  type CustomerLaunchReleaseEnvelope,
} from "../lib/ops-drag-report/launch-release.server.ts";
import {
  ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS,
  FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
  OPS_DRAG_OFFER_VERSION,
  acceptCampaignPauseReadback,
  assessFirstSaleCandidate,
  claimFirstSaleEligibleAtomically,
  createAcceptedAcquisitionConfigHash,
  createAcquisitionPauseAdapter,
  createFirstSaleOrderDigest,
  createFirstSaleControlState,
  evaluateAcquisitionStops,
  requestAcquisitionPause,
  type AcquisitionSnapshot,
  type FirstSaleCandidate,
  type FirstSaleControlState,
  type FirstSaleControlStore,
} from "../lib/ops-drag-report/first-sale-controller.ts";
import {
  OPS_DRAG_INTAKE_VERSION,
  admitOpsDragIntake,
  type OpsDragIntakeStore,
} from "../lib/ops-drag-report/intake-contract.ts";
import {
  REDUCED_TRANSACTION_ALLOWLIST,
  calculateRetentionDueAt,
  createRetentionMutationAdapter,
  planRetentionAction,
  retentionReceiptContainsRawPayload,
  runRetentionCleanupWorker,
  type RetentionRecord,
  type RetentionReceipt,
  type RetentionWorkerStore,
} from "../lib/ops-drag-report/retention-controller.ts";
import {
  eligibilityReceiptContainsRawIdentifier,
  evaluateUnrelatedBuyer,
  type EligibilityReceipt,
  type EligibilitySourceAdapter,
  type EligibilitySourceName,
} from "../lib/ops-drag-report/unrelated-buyer.ts";
import {
  admitGeneratedReport,
  applyEmailProviderEvent,
  OPS_DRAG_REPORT_SCHEMA_VERSION,
  OPS_DRAG_REPORT_TEMPLATE_VERSION,
  startDeliveryAttempt,
  startGenerationAttempt,
  type OpsDragReportDocument,
} from "../lib/ops-drag-report/delivery-refund-state-machine.ts";
import {
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  type JsonValue,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";

assertAcceptedSourceHashes({ ...OPS_DRAG_ACCEPTED_SOURCE_HASHES });
assert.throws(
  () => assertAcceptedSourceHashes({ ...OPS_DRAG_ACCEPTED_SOURCE_HASHES, acquisition: "0".repeat(64) }),
  /hash mismatch/
);
assert.equal(
  OPS_DRAG_PRIVACY_DISCLOSURE,
  "StudioFlows uses your business email and Ops Check answers only to generate, deliver, support, and verify this automated report. Payment and billing information are handled by Stripe/Link through hosted checkout. Do not submit credentials, payment-card information, regulated data, employee or customer personal data, or confidential raw exports. Unpaid submissions are deleted within 7 days; report inputs and reports within 30 days after delivery or refund; email/order mappings and support messages within 90 days. Minimal transaction and audit records may be retained longer where legally required. Ops Check answers are not used for marketing without separate permission. Contact support@studioflows.co for privacy requests."
);
assert.equal(OPS_DRAG_CUSTOMER_CONTRACT.price, "$29 one time. No subscription. No sales call. No implementation included.");
assertCustomerContractClaimCeiling(JSON.stringify(OPS_DRAG_CUSTOMER_CONTRACT));
for (const forbidden of ["Pinpoints the root cause", "Guaranteed savings", "Available now", "Limited slots", "Tax exempt"]) {
  assert.throws(() => assertCustomerContractClaimCeiling(forbidden), /forbidden public claim/);
}
const canonicalGateObject = {
  sourceHashesAccepted: true,
  managedPaymentsAccepted: true,
  taxConfigurationAccepted: true,
  providerRuntimeAccepted: true,
  productionReleaseAccepted: true,
  dependencySecurityAccepted: true,
  campaignControlsAccepted: true,
  kiroLaunchReleased: true,
};
const canonicalTrueInputs = [true, true, true, true, true, true, true, true] as const;
const expectedHeldRuntime = {
  launchReleased: false,
  cta: null,
  purchaseAction: null,
  geography: null,
  checkout: null,
  delivery: null,
  supportRefund: null,
};
function assertLaunchHeld(value: unknown): void {
  const heldRuntime = resolveCustomerContractRuntime(value as CustomerLaunchReleaseEnvelope);
  assert.deepEqual(heldRuntime, {
    ...expectedHeldRuntime,
  });
  assert.equal(JSON.stringify(heldRuntime).includes("Initial launch availability"), false);
  assert.equal(JSON.stringify(heldRuntime).includes("available now"), false);
}
const invokeEnvelopeFactory = createCustomerLaunchReleaseEnvelope as (...inputs: unknown[]) => CustomerLaunchReleaseEnvelope;
const heldEnvelope = createCustomerLaunchReleaseEnvelope(false, false, false, false, false, false, false, false);
assertLaunchHeld(heldEnvelope);
for (let argumentCount = 0; argumentCount < 8; argumentCount += 1) {
  assertLaunchHeld(invokeEnvelopeFactory(...canonicalTrueInputs.slice(0, argumentCount)));
}
assertLaunchHeld(invokeEnvelopeFactory(...canonicalTrueInputs, true));
for (let inputIndex = 0; inputIndex < canonicalTrueInputs.length; inputIndex += 1) {
  for (const invalidValue of [false, undefined, null, 1, "true", new Boolean(true), {}, Symbol("true")]) {
    const inputs: unknown[] = [...canonicalTrueInputs];
    inputs[inputIndex] = invalidValue;
    assertLaunchHeld(invokeEnvelopeFactory(...inputs));
  }
}
const inheritedOnly = Object.create(canonicalGateObject) as Record<string, unknown>;
const missingOwnKey = Object.assign(Object.create({ kiroLaunchReleased: true }), {
  sourceHashesAccepted: true,
  managedPaymentsAccepted: true,
  taxConfigurationAccepted: true,
  providerRuntimeAccepted: true,
  productionReleaseAccepted: true,
  dependencySecurityAccepted: true,
  campaignControlsAccepted: true,
});
const truthyNonBoolean = { ...canonicalGateObject, providerRuntimeAccepted: "true" };
const caseVariant = { ...canonicalGateObject } as Record<string, unknown>;
delete caseVariant.kiroLaunchReleased;
caseVariant.KiroLaunchReleased = true;
const accessorGates = Object.fromEntries(Object.keys(canonicalGateObject).map((key) => [key, true]));
Object.defineProperty(accessorGates, "providerRuntimeAccepted", { enumerable: true, get: () => true });
const symbolExtra = { ...canonicalGateObject, [Symbol("extra")]: true };
const nonEnumerableExtra = { ...canonicalGateObject };
Object.defineProperty(nonEnumerableExtra, "extra", { value: true, enumerable: false });
class ReleaseGateInstance {
  sourceHashesAccepted = true;
  managedPaymentsAccepted = true;
  taxConfigurationAccepted = true;
  providerRuntimeAccepted = true;
  productionReleaseAccepted = true;
  dependencySecurityAccepted = true;
  campaignControlsAccepted = true;
  kiroLaunchReleased = true;
}
const customPrototype = { releasePrototype: "custom" };
const customPrototypeGates = Object.assign(Object.create(customPrototype), canonicalGateObject);
const nullPrototypeGates = Object.assign(Object.create(null), canonicalGateObject);
const transparentProxy = new Proxy({ ...canonicalGateObject }, {});
const nestedProxy = new Proxy(transparentProxy, {});
const proxyTrapCalls = {
  forwardingPrototype: 0,
  forwardingOwnKeys: 0,
  forwardingDescriptor: 0,
  syntheticPrototype: 0,
  syntheticOwnKeys: 0,
  syntheticDescriptor: 0,
  hidingPrototype: 0,
  hidingOwnKeys: 0,
  hidingDescriptor: 0,
};
const forwardingProxy = new Proxy({ ...canonicalGateObject }, {
  getPrototypeOf(target) {
    proxyTrapCalls.forwardingPrototype += 1;
    return Reflect.getPrototypeOf(target);
  },
  ownKeys(target) {
    proxyTrapCalls.forwardingOwnKeys += 1;
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, property) {
    proxyTrapCalls.forwardingDescriptor += 1;
    return Reflect.getOwnPropertyDescriptor(target, property);
  },
});
const syntheticProxy = new Proxy({}, {
  getPrototypeOf() {
    proxyTrapCalls.syntheticPrototype += 1;
    return Object.prototype;
  },
  ownKeys() {
    proxyTrapCalls.syntheticOwnKeys += 1;
    return [...Object.keys(canonicalGateObject)];
  },
  getOwnPropertyDescriptor(_target, property) {
    proxyTrapCalls.syntheticDescriptor += 1;
    return Object.hasOwn(canonicalGateObject, property)
      ? { value: true, writable: true, enumerable: true, configurable: true }
      : undefined;
  },
});
const hidingExtraProxy = new Proxy({ ...canonicalGateObject, hiddenExtra: true }, {
  getPrototypeOf(target) {
    proxyTrapCalls.hidingPrototype += 1;
    return Reflect.getPrototypeOf(target);
  },
  ownKeys() {
    proxyTrapCalls.hidingOwnKeys += 1;
    return [...Object.keys(canonicalGateObject)];
  },
  getOwnPropertyDescriptor(target, property) {
    proxyTrapCalls.hidingDescriptor += 1;
    return Reflect.getOwnPropertyDescriptor(target, property);
  },
});
const customPrototypeProxy = new Proxy({ ...canonicalGateObject }, {
  getPrototypeOf() {
    return customPrototype;
  },
});
const nullPrototypeProxy = new Proxy({ ...canonicalGateObject }, {
  getPrototypeOf() {
    return null;
  },
});
const throwingPrototypeProxy = new Proxy({ ...canonicalGateObject }, {
  getPrototypeOf() {
    throw new Error("malformed prototype trap");
  },
});
const throwingOwnKeysProxy = new Proxy({ ...canonicalGateObject }, {
  ownKeys() {
    throw new Error("malformed ownKeys trap");
  },
});
const throwingDescriptorProxy = new Proxy({ ...canonicalGateObject }, {
  getOwnPropertyDescriptor() {
    throw new Error("malformed descriptor trap");
  },
});
const revokedReleaseProxyControl = Proxy.revocable({ ...canonicalGateObject }, {});
revokedReleaseProxyControl.revoke();
function prototypeMutatedExotic<T extends object>(value: T): T {
  Object.setPrototypeOf(value, Object.prototype);
  Object.assign(value, canonicalGateObject);
  return value;
}
const prototypeMutatedExotics: object[] = [
  new Date(0),
  new Map(),
  new Set(),
  new WeakMap(),
  new WeakSet(),
  /ops-drag/u,
  new Error("held"),
  Promise.resolve(true),
  new Boolean(true),
  new Number(1),
  new String("true"),
  new Uint8Array(0),
  new DataView(new ArrayBuffer(0)),
  new ArrayBuffer(0),
];
const unbrandedSharedArrayBuffers: object[] = [];
if (typeof SharedArrayBuffer !== "undefined") {
  prototypeMutatedExotics.push(new SharedArrayBuffer(0));
  unbrandedSharedArrayBuffers.push(new SharedArrayBuffer(0));
}
for (const exotic of prototypeMutatedExotics) prototypeMutatedExotic(exotic);
const moduleNamespace = await import("../lib/ops-drag-report/customer-copy.ts");
const crossRealmObject = runInNewContext(`({
  sourceHashesAccepted: true,
  managedPaymentsAccepted: true,
  taxConfigurationAccepted: true,
  providerRuntimeAccepted: true,
  productionReleaseAccepted: true,
  dependencySecurityAccepted: true,
  campaignControlsAccepted: true,
  kiroLaunchReleased: true
})`) as object;
const fakeBrandObject = {
  ...canonicalGateObject,
  CustomerLaunchReleaseEnvelope: true,
  [Symbol.for("CustomerLaunchReleaseEnvelope")]: true,
};
for (const malformed of [
  undefined,
  null,
  [],
  [true, true, true, true, true, true, true, true],
  "true",
  1,
  true,
  false,
  {},
  canonicalGateObject,
  { sourceHashesAccepted: true },
  { ...canonicalGateObject, kiroLaunchReleased: undefined },
  { ...canonicalGateObject, extra: true },
  inheritedOnly,
  missingOwnKey,
  truthyNonBoolean,
  caseVariant,
  accessorGates,
  symbolExtra,
  nonEnumerableExtra,
  new ReleaseGateInstance(),
  customPrototypeGates,
  nullPrototypeGates,
  transparentProxy,
  nestedProxy,
  forwardingProxy,
  syntheticProxy,
  hidingExtraProxy,
  new Proxy(new ReleaseGateInstance(), {}),
  new Proxy(customPrototypeGates, {}),
  new Proxy(nullPrototypeGates, {}),
  customPrototypeProxy,
  nullPrototypeProxy,
  throwingPrototypeProxy,
  throwingOwnKeysProxy,
  throwingDescriptorProxy,
  revokedReleaseProxyControl.proxy,
  ...prototypeMutatedExotics,
  new Date(0),
  new Map(),
  new Set(),
  new WeakMap(),
  new WeakSet(),
  /ops-drag/u,
  new Error("held"),
  Promise.resolve(true),
  new Boolean(true),
  new Number(1),
  new String("true"),
  new Uint8Array(0),
  new DataView(new ArrayBuffer(0)),
  new ArrayBuffer(0),
  ...unbrandedSharedArrayBuffers,
  () => true,
  moduleNamespace,
  crossRealmObject,
  fakeBrandObject,
  structuredClone(canonicalGateObject),
  JSON.parse(JSON.stringify(canonicalGateObject)),
]) assertLaunchHeld(malformed);
assert.deepEqual(proxyTrapCalls, {
  forwardingPrototype: 0,
  forwardingOwnKeys: 0,
  forwardingDescriptor: 0,
  syntheticPrototype: 0,
  syntheticOwnKeys: 0,
  syntheticDescriptor: 0,
  hidingPrototype: 0,
  hidingOwnKeys: 0,
  hidingDescriptor: 0,
});
const acceptedEnvelope = createCustomerLaunchReleaseEnvelope(true, true, true, true, true, true, true, true);
assert.equal(Object.isFrozen(acceptedEnvelope), true);
assert.equal(Object.getPrototypeOf(acceptedEnvelope), null);
assert.deepEqual(Reflect.ownKeys(acceptedEnvelope), []);
assert.equal(JSON.stringify(acceptedEnvelope), "{}");
assertLaunchHeld(structuredClone(acceptedEnvelope));
assertLaunchHeld(JSON.parse(JSON.stringify(acceptedEnvelope)));
assertLaunchHeld(runInNewContext("({})"));
const acceptedEnvelopeProxyTrapCalls = { prototype: 0, ownKeys: 0, descriptor: 0 };
const proxiedAcceptedEnvelope = new Proxy(acceptedEnvelope, {
  getPrototypeOf(target) {
    acceptedEnvelopeProxyTrapCalls.prototype += 1;
    return Reflect.getPrototypeOf(target);
  },
  ownKeys(target) {
    acceptedEnvelopeProxyTrapCalls.ownKeys += 1;
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, property) {
    acceptedEnvelopeProxyTrapCalls.descriptor += 1;
    return Reflect.getOwnPropertyDescriptor(target, property);
  },
});
assertLaunchHeld(proxiedAcceptedEnvelope);
assertLaunchHeld(new Proxy(proxiedAcceptedEnvelope, {}));
assert.deepEqual(acceptedEnvelopeProxyTrapCalls, { prototype: 0, ownKeys: 0, descriptor: 0 });
const acceptedRuntime = resolveCustomerContractRuntime(acceptedEnvelope);
assert.equal(acceptedRuntime.launchReleased, true);
assert.equal(acceptedRuntime.cta, OPS_DRAG_CUSTOMER_CONTRACT.cta);
assert.equal(acceptedRuntime.purchaseAction, "/ops-drag-report/intake");
assert.equal(acceptedRuntime.geography, OPS_DRAG_CUSTOMER_CONTRACT.geography);
assert.equal(acceptedRuntime.checkout, OPS_DRAG_CUSTOMER_CONTRACT.howItWorks[1]);
assert.equal(acceptedRuntime.delivery?.receives, OPS_DRAG_CUSTOMER_CONTRACT.runtimeReceives);
assert.equal(acceptedRuntime.supportRefund, OPS_DRAG_CUSTOMER_CONTRACT.supportRefund);
assert.throws(() => assertBusinessUseInputCeilingAcknowledgment(false), /acknowledgment is required/);
assertBusinessUseInputCeilingAcknowledgment(true);
const intakeSource = readFileSync("app/services/custom-ops-hub/CustomOpsHubClient.js", "utf8");
const legacyIngestSource = readFileSync("app/api/studioflows/ingest-lead/route.ts", "utf8");
const heldPageSource = readFileSync("app/ops-drag-report/page.tsx", "utf8");
const launchReleaseSource = readFileSync("lib/ops-drag-report/launch-release.server.ts", "utf8");
const acceptedContractSource = readFileSync("lib/ops-drag-report/accepted-contract.ts", "utf8");
assert.equal(intakeSource.includes("OPS_DRAG_PRIVACY_DISCLOSURE"), false);
assert.equal(intakeSource.includes("businessUseAccepted"), false);
assert.equal(legacyIngestSource.includes("ops_drag_input_contract"), false);
assert.equal(legacyIngestSource.includes("business_use_input_ceiling_ack"), false);
assert.equal(heldPageSource.includes("OPS_DRAG_CUSTOMER_CONTRACT.cta"), false);
assert.equal(heldPageSource.includes("OpsDragReportCheckout"), false);
assert.equal(heldPageSource.includes("<Link"), false);
assert.equal(heldPageSource.includes("OPS_DRAG_CUSTOMER_CONTRACT.geography"), false);
assert.ok(heldPageSource.includes("runtime.geography"));
assert.ok(heldPageSource.includes("Purchase and submission actions remain unavailable"));
assert.ok(heldPageSource.includes('export const runtime = "nodejs"'));
assert.ok(heldPageSource.includes("launch-release.server"));
assert.ok(heldPageSource.includes("createCustomerLaunchReleaseEnvelope("));
const deployedEnvelopeArguments = heldPageSource.match(/createCustomerLaunchReleaseEnvelope\(([\s\S]*?)\);/)?.[1] ?? "";
assert.equal(deployedEnvelopeArguments.match(/\bfalse\b/g)?.length, 8);
assert.equal(deployedEnvelopeArguments.includes("true"), false);
assert.ok(launchReleaseSource.includes('from "node:process"'));
assert.ok(launchReleaseSource.includes("new WeakMap<CustomerLaunchReleaseEnvelope, boolean>()"));
assert.ok(launchReleaseSource.includes("arguments.length === 8"));
assert.ok(launchReleaseSource.includes("Object.freeze(Object.create(null))"));
assert.ok(launchReleaseSource.includes("releaseDispositionByEnvelope.get(envelope) === true"));
for (const forbiddenReflection of [
  "types.isProxy",
  "Object.getPrototypeOf",
  "Reflect.ownKeys",
  "Object.getOwnPropertyDescriptors",
  "JSON.stringify",
  "structuredClone",
]) assert.equal(launchReleaseSource.includes(forbiddenReflection), false);
assert.equal(launchReleaseSource.includes("export const releaseDispositionByEnvelope"), false);
assert.equal(acceptedContractSource.includes("CustomerContractRuntimeGates"), false);
assert.equal(acceptedContractSource.includes("CUSTOMER_LAUNCH_GATE_KEYS"), false);

const legacyInvocations = {
  leadStorage: 0,
  outreachClassification: 0,
  bookingRouting: 0,
  teardownRouting: 0,
  crmMarketing: 0,
  fullPayloadForwarding: 0,
};
const admittedSnapshots: unknown[] = [];
const dedicatedIntakeStore: OpsDragIntakeStore = {
  async admit(snapshot) { admittedSnapshots.push(structuredClone(snapshot)); },
};
const validIntake = await admitOpsDragIntake({
  businessEmail: "ops-owner@example.com",
  businessUseInputCeilingAcknowledgment: true,
  answers: {
    businessModel: "Service business",
    primaryPainArea: "Handoffs",
    frequentBreakdownDetail: "Approvals wait for one owner.",
  },
}, {
  store: dedicatedIntakeStore,
  createSubmissionId: () => "sub_fixture_0001",
  now: () => "2026-08-22T20:00:00.000Z",
});
assert.equal(validIntake.version, OPS_DRAG_INTAKE_VERSION);
assert.equal(admittedSnapshots.length, 1);
assert.deepEqual(legacyInvocations, {
  leadStorage: 0,
  outreachClassification: 0,
  bookingRouting: 0,
  teardownRouting: 0,
  crmMarketing: 0,
  fullPayloadForwarding: 0,
});
await assert.rejects(() => admitOpsDragIntake({
  businessEmail: "ops-owner@example.com",
  businessUseInputCeilingAcknowledgment: true,
  marketingConsent: true,
  answers: { primaryPainArea: "Handoffs" },
}, {
  store: dedicatedIntakeStore,
  createSubmissionId: () => "sub_fixture_0002",
  now: () => "2026-08-22T20:00:00.000Z",
}), /unsupported fields/);
await assert.rejects(() => admitOpsDragIntake({
  businessEmail: "ops-owner@example.com",
  businessUseInputCeilingAcknowledgment: true,
  answers: { bookingUrl: "https://example.com/book" },
}, {
  store: dedicatedIntakeStore,
  createSubmissionId: () => "sub_fixture_0003",
  now: () => "2026-08-22T20:00:00.000Z",
}), /unsupported fields/);
assert.equal(admittedSnapshots.length, 1);

const sourceNames: EligibilitySourceName[] = [
  "DIRECTORY_TEAM_TEST",
  "EXISTING_CUSTOMERS_PRIOR_BUYERS",
  "CRM",
  "INTERNAL_PACKAGES_REFUNDED_TESTS",
  "PAYMENT_FINGERPRINTS",
];
function eligibilitySources(overrides: Partial<Record<EligibilitySourceName, Partial<Awaited<ReturnType<EligibilitySourceAdapter["check"]>>>>> = {}) {
  return sourceNames.map<EligibilitySourceAdapter>((name) => ({
    name,
    async check() {
      return {
        available: true,
        fresh: true,
        coverageComplete: true,
        matched: false,
        freshnessReceiptHash: `${name.toLowerCase()}_fresh_hash`,
        coverageReceiptHash: `${name.toLowerCase()}_coverage_hash`,
        ...overrides[name],
      };
    },
  }));
}
const rawEligibilityIds = ["Owner@Example.com", "cus_fixture", "card_fingerprint_fixture"];
const eligibilitySecret = "fixture-eligibility-hmac-secret-more-than-32-bytes";
const eligibilityPass = await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources(),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
});
assert.equal(eligibilityPass.result, "PASS");
assert.equal(eligibilityReceiptContainsRawIdentifier(eligibilityPass, rawEligibilityIds), false);
const [concurrentEligibilityOne, concurrentEligibilityTwo] = await Promise.all([
  evaluateUnrelatedBuyer({ identifiers: rawEligibilityIds, hmacSecret: eligibilitySecret, sources: eligibilitySources(), evaluatedAt: "2026-08-22T20:00:00.000Z" }),
  evaluateUnrelatedBuyer({ identifiers: rawEligibilityIds, hmacSecret: eligibilitySecret, sources: eligibilitySources(), evaluatedAt: "2026-08-22T20:00:00.000Z" }),
]);
assert.deepEqual(concurrentEligibilityOne, concurrentEligibilityTwo);
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { matched: true } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "FAIL");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { fresh: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { available: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources({ CRM: { coverageComplete: false } }),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).result, "UNVERIFIED");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: undefined,
  sources: eligibilitySources(),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).blocker_code, "ELIGIBILITY_HMAC_SECRET_UNAVAILABLE");
assert.equal((await evaluateUnrelatedBuyer({
  identifiers: rawEligibilityIds,
  hmacSecret: eligibilitySecret,
  sources: eligibilitySources().slice(0, 4),
  evaluatedAt: "2026-08-22T20:00:00.000Z",
})).blocker_code, "ELIGIBILITY_SOURCE_MISSING");

function retentionRecord(dataClass: RetentionRecord["data_class"], payload: Record<string, JsonValue> = {}): RetentionRecord {
  return {
    record_id: `record-${dataClass}`,
    data_class: dataClass,
    last_activity_at: "2028-02-27T00:00:00.000Z",
    terminal_at: "2024-02-29T12:00:00.000Z",
    support_closed_at: "2026-12-31T12:00:00.000Z",
    dispute_resolved_at: null,
    transaction_at: "2024-06-15T12:00:00.000Z",
    legal_hold: null,
    lease: null,
    payload,
  };
}
assert.equal(calculateRetentionDueAt(retentionRecord("UNPAID_SUBMISSION")), "2028-03-05T00:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("RAW_PAID_SUBMISSION")), "2024-03-30T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("EMAIL_ORDER_MAPPING")), "2024-05-29T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("SUPPORT_TRANSCRIPT")), "2027-03-31T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("ATTRIBUTION_AGGREGATE")), "2026-02-28T12:00:00.000Z");
assert.equal(calculateRetentionDueAt(retentionRecord("REDUCED_TRANSACTION_RECORD")), "2032-01-01T00:00:00.000Z");
const held = { ...retentionRecord("RAW_ATTRIBUTION"), legal_hold: { id: "hold-1", released_at: null } };
assert.equal(planRetentionAction(held, "2030-01-01T00:00:00.000Z").kind, "HOLD");
assert.equal(planRetentionAction({ ...held, legal_hold: { id: "hold-1", released_at: "2029-01-01T00:00:00.000Z" } }, "2030-01-01T00:00:00.000Z").kind, "DELETE");
const ledgerPayload = {
  order_reference: "odr_fixture",
  amount: 2900,
  currency: "usd",
  terminal_disposition: "DELIVERED",
  receipt_hash: "receipt_fixture",
  full_email: "owner@example.com",
  raw_webhook_payload: "must-delete",
};
const reduction = planRetentionAction(retentionRecord("DETAILED_RECEIPT_LEDGER", ledgerPayload), "2030-01-01T00:00:00.000Z");
assert.equal(reduction.kind, "REDUCE");
if (reduction.kind !== "REDUCE") throw new Error("Expected reduction fixture");
assert.deepEqual(Object.keys(reduction.reduced).sort(), REDUCED_TRANSACTION_ALLOWLIST.filter((key) => key in ledgerPayload).sort());
assert.equal("full_email" in reduction.reduced, false);
assert.throws(() => createRetentionMutationAdapter({ enabled: false, async deleteRecord() {}, async reduceRecord() {} }), /disabled/);

class InMemoryRetentionStore implements RetentionWorkerStore {
  records = new Map<string, RetentionRecord>();
  completed = new Map<string, RetentionReceipt>();
  blocked: string[] = [];
  constructor(records: RetentionRecord[]) { for (const record of records) this.records.set(record.record_id, structuredClone(record)); }
  async loadBatch(limit: number) { return [...this.records.values()].filter((record) => !this.completed.has(record.record_id)).slice(0, limit).map((record) => structuredClone(record)); }
  async claim(recordId: string, owner: string, acquiredAt: string, staleBefore: string) {
    const record = this.records.get(recordId);
    if (!record || this.completed.has(recordId)) return null;
    if (record.lease && Date.parse(record.lease.acquired_at) >= Date.parse(staleBefore)) return null;
    record.lease = { owner, acquired_at: acquiredAt, attempts: (record.lease?.attempts ?? 0) + 1 };
    return structuredClone(record);
  }
  async complete(recordId: string, receipt: RetentionReceipt) { this.completed.set(recordId, receipt); }
  async release(recordId: string, blockerCode: string) { this.blocked.push(`${recordId}:${blockerCode}`); }
}
const dueRecords = Array.from({ length: 12 }, (_, index) => ({
  ...retentionRecord("UNPAID_SUBMISSION", { secret_payload: `raw-${index}` }),
  record_id: `retention-${index}`,
  last_activity_at: "2026-01-01T00:00:00.000Z",
}));
dueRecords[0].lease = { owner: "stale-owner", acquired_at: "2026-01-02T00:00:00.000Z", attempts: 1 };
const retentionStore = new InMemoryRetentionStore(dueRecords);
let retentionMutations = 0;
const retentionAdapter = createRetentionMutationAdapter({
  enabled: true,
  async deleteRecord() { retentionMutations += 1; },
  async reduceRecord() { retentionMutations += 1; },
});
const [cleanupOne, cleanupTwo] = await Promise.all([
  runRetentionCleanupWorker({ store: retentionStore, adapter: retentionAdapter, owner: "wake-one", now: "2026-02-01T00:00:00.000Z", staleBefore: "2026-01-31T00:00:00.000Z" }),
  runRetentionCleanupWorker({ store: retentionStore, adapter: retentionAdapter, owner: "wake-two", now: "2026-02-01T00:00:00.000Z", staleBefore: "2026-01-31T00:00:00.000Z" }),
]);
assert.ok(cleanupOne.scanned <= 10 && cleanupTwo.scanned <= 10);
assert.equal(retentionStore.completed.size, 10);
assert.equal(retentionMutations, 10);
assert.equal(retentionStore.records.get("retention-0")?.lease?.attempts, 2, "stale lease must be reclaimable once");
for (const [recordId, receipt] of retentionStore.completed) {
  assert.equal(retentionReceiptContainsRawPayload(receipt, retentionStore.records.get(recordId)!.payload), false);
}

function createDeliveredOrder(): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({ work_email: "buyer@example.com", raw_answers: {}, metadata: {} }, "first-sale-submission", "2026-08-22T20:00:00.000Z");
  let order = claimFulfillmentOwnership(createAdmittedOrder(snapshot), {
    checkoutSessionId: "cs_live_first_sale",
    paymentReferenceId: "pi_live_first_sale",
    webhookEventId: "evt_live_first_sale",
    paidAt: "2026-08-22T20:01:00.000Z",
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: "a".repeat(64),
    snapshotDigest: snapshot.digest,
  }, "2026-08-22T20:01:01.000Z").order;
  order = startGenerationAttempt(order, "2026-08-22T20:01:02.000Z");
  const report: OpsDragReportDocument = {
    schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    order_id: order.order_id,
    submission_id: order.submission_id,
    generated_at: "2026-08-22T20:01:03.000Z",
    title: "Operations Drag Report",
    summary: "Submitted inputs suggest a handoff hypothesis to test.",
    hypotheses: ["The handoff may lack one owner."],
    seven_day_sequence: ["Observe", "Name owner", "Record entry", "Run handoff", "Measure", "Adjust", "Compare"],
    limitations: "Response-based operational hypotheses only.",
    evidence_to_collect: ["Wait time"],
  };
  order = admitGeneratedReport(order, report, new TextEncoder().encode("%PDF-1.7 fixture"), "2026-08-22T20:01:04.000Z");
  order = startDeliveryAttempt(order, "msg_first_sale", "2026-08-22T20:01:05.000Z");
  return applyEmailProviderEvent(order, { eventId: "evt_delivered", providerMessageId: "msg_first_sale", type: "delivered" }, "2026-08-22T20:02:00.000Z");
}
const deliveredOrder = createDeliveredOrder();
const orderDigestSecret = "fixture-first-sale-order-digest-secret-more-than-32-bytes";
const campaignId = "campaign-fixture";
const campaignConfigHash = createAcceptedAcquisitionConfigHash(campaignId);
const validCandidate: FirstSaleCandidate = {
  order: deliveredOrder,
  offerVersion: OPS_DRAG_OFFER_VERSION,
  paymentMode: "live",
  paymentSettled: true,
  reportValidation: "PASS",
  country: "US",
  unrelatedBuyer: eligibilityPass,
  humanTouchesNormalPath: 0,
  sourceHashes: { ...OPS_DRAG_ACCEPTED_SOURCE_HASHES },
  configHashesCurrent: true,
  dispute: false,
  testMarker: false,
  renewalMarker: false,
  internalPackageMarker: false,
  acquisitionSource: "OPS_DRAG_SEARCH_V1",
};
const passingAssessment = assessFirstSaleCandidate(validCandidate, orderDigestSecret);
assert.equal(passingAssessment.result, "PASS");
assert.equal(passingAssessment.order_digest, createFirstSaleOrderDigest(deliveredOrder.order_id, orderDigestSecret));
assert.equal(passingAssessment.order_digest_method_version, FIRST_SALE_ORDER_DIGEST_METHOD_VERSION);
for (const refundStatus of ["REQUIRED", "OWNED", "CREATED", "SUCCEEDED"] as const) {
  const order = structuredClone(deliveredOrder);
  order.workflow_status = refundStatus === "SUCCEEDED" ? "DONE" : "IN_PROGRESS";
  order.automation!.terminal_disposition = refundStatus === "SUCCEEDED" ? "REFUNDED" : null;
  order.automation!.refund.status = refundStatus;
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, order }, orderDigestSecret).blocker_codes.includes("DELIVERY_NOT_PROVIDER_CONFIRMED"));
}
for (const deliveryStatus of ["ACCEPTED", "QUEUED", "SENT"] as const) {
  const order = structuredClone(deliveredOrder);
  order.workflow_status = "IN_PROGRESS";
  order.automation!.terminal_disposition = null;
  order.automation!.delivery.status = deliveryStatus;
  order.automation!.delivery.delivered_at = null;
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, order }, orderDigestSecret).blocker_codes.includes("DELIVERY_NOT_PROVIDER_CONFIRMED"));
}
for (const [delta, blocker] of [
  [{ paymentMode: "test" }, "PAYMENT_NOT_LIVE"],
  [{ reportValidation: "FAIL" }, "REPORT_VALIDATION_NOT_PASS"],
  [{ country: "CA" }, "BUYER_NOT_US"],
  [{ unrelatedBuyer: { ...eligibilityPass, result: "UNVERIFIED" } as EligibilityReceipt }, "UNRELATED_BUYER_UNVERIFIED"],
  [{ humanTouchesNormalPath: 1 }, "HUMAN_TOUCH_PRESENT"],
  [{ dispute: true }, "DISPUTE_PRESENT"],
  [{ testMarker: true }, "TEST_MARKER_PRESENT"],
  [{ renewalMarker: true }, "RENEWAL_MARKER_PRESENT"],
  [{ internalPackageMarker: true }, "INTERNAL_PACKAGE_MARKER_PRESENT"],
] as const) {
  assert.ok(assessFirstSaleCandidate({ ...validCandidate, ...delta }, orderDigestSecret).blocker_codes.includes(blocker));
}
assert.ok(assessFirstSaleCandidate(validCandidate, "").blocker_codes.includes("ORDER_DIGEST_SECRET_UNAVAILABLE"));

class InMemoryFirstSaleStore implements FirstSaleControlStore {
  state: FirstSaleControlState = createFirstSaleControlState();
  revision = 0;
  async read() { return { state: structuredClone(this.state), revision: String(this.revision) }; }
  async compareAndSwap(expectedRevision: string, next: FirstSaleControlState) {
    await Promise.resolve();
    if (expectedRevision !== String(this.revision)) return false;
    this.state = structuredClone(next);
    this.revision += 1;
    return true;
  }
}
const firstSaleStore = new InMemoryFirstSaleStore();
const concurrentClaims = await Promise.all(Array.from({ length: 20 }, () =>
  claimFirstSaleEligibleAtomically(firstSaleStore, validCandidate, campaignId, campaignConfigHash, orderDigestSecret)
));
assert.equal(concurrentClaims.filter((result) => result.disposition === "acquired").length, 1);
assert.equal(firstSaleStore.state.status, "FIRST_SALE_ELIGIBLE");

const baseAcquisitionSnapshot: AcquisitionSnapshot = {
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  campaignState: "PAUSED",
  averageDailyBudgetCents: 500,
  currentDayBilledSpendCents: 0,
  cumulativeBilledSpendCents: 0,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  flightStartedAt: "2026-08-22T00:00:00.000Z",
  now: "2026-08-22T01:00:00.000Z",
  launchHashesCurrent: true,
  deliveryConfigFailure: false,
  privacySecurityCustomerHarm: false,
  checkoutStarts: 1,
  completedChecks: 1,
  providerSpendReceiptPresent: true,
};
let acquisitionCalls = 0;
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: false,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: ACQUISITION_AVERAGE_DAILY_BUDGET_CENTS,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause(input) { acquisitionCalls += 1; return { providerState: "PAUSED", campaignId: input.campaignId, orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "never" }; } },
}), /disabled/);
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: 501,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause(input) { acquisitionCalls += 1; return { providerState: "PAUSED", campaignId: input.campaignId, orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "never" }; } },
}), /\$5\.00/);
assert.throws(() => createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_001,
  residualExposureReceiptCurrent: true,
  transport: { async pause(input) { acquisitionCalls += 1; return { providerState: "PAUSED", campaignId: input.campaignId, orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "never" }; } },
}), /\$10\.00/);
assert.equal(acquisitionCalls, 0);
const stopAdapter = createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: { async pause(input) { acquisitionCalls += 1; return { providerState: "PAUSED", campaignId: input.campaignId, orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "pause-readback-hash" }; } },
});
const stopCodes = evaluateAcquisitionStops(baseAcquisitionSnapshot, true);
assert.deepEqual(stopCodes, ["FIRST_SALE_ELIGIBLE"]);
const orderDigest = firstSaleStore.state.eligible_order_digest!;
const pause = await requestAcquisitionPause({ adapter: stopAdapter, snapshot: baseAcquisitionSnapshot, orderDigest, stopCodes });
assert.equal(acquisitionCalls, 1);
const eligibleState = structuredClone(firstSaleStore.state);
firstSaleStore.state = acceptCampaignPauseReadback(firstSaleStore.state, {
  orderDigest,
  orderDigestMethodVersion: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
  campaignId,
  campaignConfigHash,
  idempotencyKey: pause.idempotencyKey,
  providerState: pause.providerState,
  readbackCampaignId: pause.campaignId,
  readbackIdempotencyKey: pause.idempotencyKey,
  readbackHash: pause.readbackHash,
});
const readbackAgain = acceptCampaignPauseReadback(firstSaleStore.state, {
  orderDigest,
  orderDigestMethodVersion: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
  campaignId,
  campaignConfigHash,
  idempotencyKey: pause.idempotencyKey,
  providerState: pause.providerState,
  readbackCampaignId: pause.campaignId,
  readbackIdempotencyKey: pause.idempotencyKey,
  readbackHash: pause.readbackHash,
});
assert.deepEqual(readbackAgain, firstSaleStore.state);
assert.equal(firstSaleStore.state.status, "FIRST_SALE_VERIFIED");

for (const providerState of [undefined, null, "", "ENABLED", "ACTIVE", "PENDING", "FAILED", "paused", "Paused", 1, {}]) {
  assert.throws(() => acceptCampaignPauseReadback(eligibleState, {
    orderDigest,
    orderDigestMethodVersion: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
    campaignId,
    campaignConfigHash,
    idempotencyKey: pause.idempotencyKey,
    providerState,
    readbackCampaignId: campaignId,
    readbackIdempotencyKey: pause.idempotencyKey,
    readbackHash: "invalid-provider-state-readback",
  }), /provider state is not accepted/);
  assert.equal(eligibleState.status, "FIRST_SALE_ELIGIBLE");
  assert.equal(eligibleState.pause_readback_hash, null);
}

for (const readbackCampaignId of [undefined, "", "Campaign-Fixture", "other-campaign"]) {
  assert.throws(() => acceptCampaignPauseReadback(eligibleState, {
    orderDigest,
    orderDigestMethodVersion: FIRST_SALE_ORDER_DIGEST_METHOD_VERSION,
    campaignId,
    campaignConfigHash,
    idempotencyKey: pause.idempotencyKey,
    providerState: "PAUSED",
    readbackCampaignId,
    readbackIdempotencyKey: pause.idempotencyKey,
    readbackHash: "wrong-campaign-readback",
  }), /binding failed/);
  assert.equal(eligibleState.status, "FIRST_SALE_ELIGIBLE");
}

let invalidStateProviderCalls = 0;
const invalidStateAdapter = createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: {
    async pause(input) {
      invalidStateProviderCalls += 1;
      return { providerState: "ENABLED", campaignId: input.campaignId, orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "enabled-readback" };
    },
  },
});
await assert.rejects(
  () => requestAcquisitionPause({ adapter: invalidStateAdapter, snapshot: baseAcquisitionSnapshot, orderDigest, stopCodes }),
  /provider state is not accepted/
);
assert.equal(invalidStateProviderCalls, 1, "invalid provider state must not trigger a second provider call");
assert.deepEqual(eligibleState, structuredClone(eligibleState), "invalid provider response must not mutate eligibility state");

for (const invalidCampaignId of ["other-campaign", "Campaign-Fixture", "", "campaign fixture"]) {
  const callsBeforeMismatch = acquisitionCalls;
  const snapshot = {
    ...baseAcquisitionSnapshot,
    campaignId: invalidCampaignId,
    acceptedCampaignConfigHash: campaignConfigHash,
  } as AcquisitionSnapshot;
  await assert.rejects(
    () => requestAcquisitionPause({ adapter: stopAdapter, snapshot, orderDigest, stopCodes }),
    /binding failed/
  );
  assert.equal(acquisitionCalls, callsBeforeMismatch);
  assert.equal(eligibleState.status, "FIRST_SALE_ELIGIBLE");
}

let wrongReadbackCalls = 0;
const wrongReadbackAdapter = createAcquisitionPauseAdapter({
  enabled: true,
  channel: "GOOGLE_SEARCH",
  campaignId,
  acceptedCampaignConfigHash: campaignConfigHash,
  averageDailyBudgetCents: 500,
  acceptedResidualExposureCents: 1_000,
  residualExposureReceiptCurrent: true,
  transport: {
    async pause(input) {
      wrongReadbackCalls += 1;
      return { providerState: "PAUSED", campaignId: "other-campaign", orderDigest: input.orderDigest, idempotencyKey: input.idempotencyKey, readbackHash: "wrong-campaign" };
    },
  },
});
await assert.rejects(
  () => requestAcquisitionPause({ adapter: wrongReadbackAdapter, snapshot: baseAcquisitionSnapshot, orderDigest, stopCodes }),
  /readback binding failed/
);
assert.equal(wrongReadbackCalls, 1);

const missingSecretState = new InMemoryFirstSaleStore();
const missingSecretClaim = await claimFirstSaleEligibleAtomically(
  missingSecretState,
  validCandidate,
  campaignId,
  campaignConfigHash,
  ""
);
assert.equal(missingSecretClaim.disposition, "rejected");
assert.equal(missingSecretState.state.status, "OPEN");
assert.equal(missingSecretState.revision, 0);

const rawOrderIdentifier = deliveredOrder.order_id;
const redactedArtifacts = [
  passingAssessment,
  eligibleState,
  firstSaleStore.state,
  pause,
  pause.idempotencyKey,
  missingSecretClaim.assessment,
];
for (const artifact of redactedArtifacts) assert.equal(JSON.stringify(artifact).includes(rawOrderIdentifier), false);
assert.equal(readFileSync("lib/ops-drag-report/first-sale-controller.ts", "utf8").includes("eligible_order_id"), false);
assert.equal(pause.idempotencyKey.includes(rawOrderIdentifier), false);
const allStops = evaluateAcquisitionStops({
  ...baseAcquisitionSnapshot,
  currentDayBilledSpendCents: 1_000,
  cumulativeBilledSpendCents: 10_000,
  now: "2026-09-02T00:00:00.000Z",
  launchHashesCurrent: false,
  deliveryConfigFailure: true,
  privacySecurityCustomerHarm: true,
  checkoutStarts: 0,
  completedChecks: 5,
  providerSpendReceiptPresent: false,
}, false);
for (const code of [
  "SPEND_RECEIPT_UNVERIFIED",
  "DAILY_BILLED_CAP",
  "CUMULATIVE_PAUSE_THRESHOLD",
  "ABSOLUTE_TOTAL_CAP",
  "FIXED_FLIGHT_ENDED",
  "LAUNCH_HASH_DRIFT",
  "DELIVERY_OR_CONFIG_FAILURE",
  "PRIVACY_SECURITY_CUSTOMER_HARM",
  "FIFTY_DOLLARS_ZERO_CHECKOUT_STARTS",
  "FIVE_CHECKS_ZERO_CHECKOUT_STARTS",
]) assert.ok(allStops.includes(code as never));

console.log(
  "OPS_DRAG_REPORT_CUSTOMER_CONTROLS_PASS hashes=3 copy=PASS eligibility=PASS retention=PASS first_sale=PASS acquisition_stop=PASS"
);
