import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canonicalJson,
  calculateOpsDragAdmittedSnapshotDigest,
  claimFulfillmentOwnership,
  createAdmittedOrder,
  createAdmittedSnapshot,
  sha256,
  type OpsDragOrder,
} from "../lib/ops-drag-report/order-foundation.ts";
import { createOpsTeardownAccessToken } from "../lib/ops-teardown/access-token.ts";
import {
  loadAuthorizedOpsTeardown,
  sendAuthorizedOpsTeardownEmail,
  type OpsTeardownAccessDependencies,
  type OpsTeardownEmailDependencies,
} from "../lib/ops-teardown/authorized-access.ts";
import { buildOpsTeardownSheet } from "../lib/ops-teardown/build-teardown-sheet.js";
import {
  fetchOpsTeardownOrderRow,
  OPS_TEARDOWN_ORDER_COLUMNS,
} from "../lib/ops-teardown/load-teardown-sheet.js";
import { renderTeardownPdf } from "../lib/ops-teardown/render-teardown-pdf.js";

const leadId = "81a322ec-bb97-4a27-8308-cd9ed715ec84";
const admittedEmail = "snapshot-owner@example.com";
const admittedAt = "2026-08-22T21:00:00.000Z";
const now = "2026-08-22T21:05:00.000Z";
const expiresAt = "2026-08-22T21:10:00.000Z";
const secret = "snapshot-immutability-fixture-secret-32-chars";

const admittedLead = {
  id: leadId,
  work_email: admittedEmail,
  company_name: "Immutable Operations",
  company_website: "https://immutable.example",
  business_model: "Professional services",
  company_stage: "Established",
  primary_pain_area: "Handoffs",
  highest_cost_bottleneck: "Manual triage",
  workflow_management: ["Spreadsheets", "Email"],
  frequent_breakdown: "Ownership",
  urgency_window: "This quarter",
  quarter_risk: "Delivery delay",
  implementation_ownership: "Internal owner",
  budget_range: "Budget approved",
  approval_involvement: "Founder approval",
  raw_answers: {},
  metadata: {
    pre_qual: { score: 10, band: "moderate", answers: [] },
    qualification_score: 17,
  },
};

const snapshot = createAdmittedSnapshot(admittedLead, leadId, admittedAt);
const admittedOrder = createAdmittedOrder(snapshot);
const paidOrder = claimFulfillmentOwnership(admittedOrder, {
  checkoutSessionId: "cs_test_snapshot_immutable",
  paymentReferenceId: "pi_test_snapshot_immutable",
  webhookEventId: "evt_test_snapshot_immutable",
  paidAt: admittedAt,
  amountTotal: 2_900,
  currency: "usd",
  customerEmailSha256: sha256(admittedEmail),
  snapshotDigest: snapshot.digest,
  snapshotDigestVersion: snapshot.digest_contract_version,
}, admittedAt).order;

const mutablePersistedRow: Record<string, unknown> = {
  ...admittedLead,
  metadata: {
    ...admittedLead.metadata,
    ops_drag_report_order: paidOrder,
  },
};

const mutatedValues = [
  "MUTATED COMPANY",
  "attacker@example.net",
  "MUTATED HANDOFF",
  "https://mutated.example",
  "MUTATED RAW ANSWER",
];
Object.assign(mutablePersistedRow, {
  work_email: mutatedValues[1],
  company_name: mutatedValues[0],
  company_website: mutatedValues[3],
  primary_pain_area: mutatedValues[2],
  highest_cost_bottleneck: "MUTATED BOTTLENECK",
  raw_answers: {
    companyName: mutatedValues[0],
    workEmail: mutatedValues[1],
    primaryPainArea: mutatedValues[4],
  },
});

const queryReceipts: Array<{ table: string; columns: string; filter: [string, string] }> = [];
function createMinimalOrderClient(order: OpsDragOrder = paidOrder): SupabaseClient {
  return {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            eq(column: string, value: string) {
              return {
                async maybeSingle() {
                  queryReceipts.push({ table, columns, filter: [column, value] });
                  return {
                    data: {
                      id: mutablePersistedRow.id,
                      ops_drag_report_order: order,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function accessToken(purpose: "view" | "pdf" | "email"): string {
  return createOpsTeardownAccessToken({
    order: paidOrder,
    purpose,
    tokenId: `snapshot-${purpose}-token-0001`,
    issuedAt: admittedAt,
    expiresAt,
    secret,
  });
}

function rewriteAndSignClaim(
  signedToken: string,
  mutate: (claims: Record<string, unknown>) => void,
): string {
  const parts = signedToken.split(".");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  mutate(claims);
  const payload = Buffer.from(canonicalJson(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `v1.${payload}.${signature}`;
}

function dependencies(
  order: OpsDragOrder = paidOrder,
  overrides: Partial<OpsTeardownAccessDependencies> = {},
) {
  const counters = { clients: 0, reads: 0 };
  const client = createMinimalOrderClient(order);
  const value: OpsTeardownAccessDependencies = {
    createClient: () => {
      counters.clients += 1;
      return client;
    },
    fetchRow: async (supabase, requestedLeadId) => {
      counters.reads += 1;
      return fetchOpsTeardownOrderRow(supabase, requestedLeadId);
    },
    signingSecret: () => secret,
    now: () => now,
    ...overrides,
  };
  return { counters, value };
}

const expectedSheet = buildOpsTeardownSheet({
  leadId: snapshot.report_input.leadId,
  quizPayload: snapshot.report_input.quizPayload,
  preQual: snapshot.report_input.preQual,
  qualificationScore: snapshot.report_input.qualificationScore,
  generatedAt: snapshot.admitted_at,
});
const expectedSheetBytes = Buffer.from(canonicalJson(expectedSheet));

const authorizedByPurpose = [];
for (const purpose of ["view", "pdf"] as const) {
  const harness = dependencies();
  const result = await loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken(purpose)}`,
    purpose,
  }, harness.value);
  authorizedByPurpose.push(result);
  assert.deepEqual(Buffer.from(canonicalJson(result.sheet)), expectedSheetBytes);
  assert.equal(result.recipientEmail, admittedEmail);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

let deliveredSheetBytes: Buffer | null = null;
let deliveredPdfBytes: Buffer | null = null;
let deliveredRecipient = "";
{
  const harness = dependencies();
  const emailDependencies: OpsTeardownEmailDependencies = {
    ...harness.value,
    sendEmail: (async (input) => {
      deliveredSheetBytes = Buffer.from(canonicalJson(input.sheet));
      deliveredPdfBytes = await renderTeardownPdf(input.sheet);
      deliveredRecipient = input.toEmail;
      return { id: "snapshot-email-fixture", filename: "snapshot.pdf" };
    }) as OpsTeardownEmailDependencies["sendEmail"],
  };
  await sendAuthorizedOpsTeardownEmail({
    authorization: `Bearer ${accessToken("email")}`,
    body: {},
    siteOrigin: "https://preview.example.com",
  }, emailDependencies);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

assert.deepEqual(deliveredSheetBytes, expectedSheetBytes);
assert.equal(deliveredRecipient, admittedEmail);
const viewPdfBytes = await renderTeardownPdf(authorizedByPurpose[0].sheet);
const pdfRouteBytes = await renderTeardownPdf(authorizedByPurpose[1].sheet);
assert.equal(sha256(viewPdfBytes.toString("base64")), sha256(pdfRouteBytes.toString("base64")));
assert.equal(sha256(viewPdfBytes.toString("base64")), sha256(deliveredPdfBytes!.toString("base64")));

const serializedOutputs = [
  expectedSheetBytes.toString("utf8"),
  deliveredSheetBytes!.toString("utf8"),
].join("|");
for (const mutatedValue of mutatedValues) {
  assert.equal(serializedOutputs.includes(mutatedValue), false, `${mutatedValue} must not enter customer output`);
}

assert.deepEqual(queryReceipts, Array.from({ length: 3 }, () => ({
  table: "custom_ops_hub_leads",
  columns: OPS_TEARDOWN_ORDER_COLUMNS,
  filter: ["id", leadId],
})));
for (const forbiddenColumn of [
  "work_email",
  "company_name",
  "company_website",
  "primary_pain_area",
  "raw_answers",
]) {
  assert.equal(OPS_TEARDOWN_ORDER_COLUMNS.includes(forbiddenColumn), false);
}

{
  const tamperedOrder = structuredClone(paidOrder);
  tamperedOrder.snapshot.report_input.quizPayload.companyName = "TAMPERED STORED SNAPSHOT";
  const harness = dependencies(tamperedOrder);
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken("view")}`,
    purpose: "view",
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

{
  const changedDigestOrder = structuredClone(paidOrder);
  changedDigestOrder.snapshot.digest = "1".repeat(64);
  const harness = dependencies(changedDigestOrder);
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken("view")}`,
    purpose: "view",
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

for (const purpose of ["view", "pdf"] as const) {
  const admittedAtTamper = structuredClone(paidOrder);
  admittedAtTamper.snapshot.admitted_at = "2026-08-22T21:00:01.000Z";
  const harness = dependencies(admittedAtTamper);
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken(purpose)}`,
    purpose,
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

{
  const admittedAtTamper = structuredClone(paidOrder);
  admittedAtTamper.snapshot.admitted_at = "2026-08-22T21:00:01.000Z";
  const harness = dependencies(admittedAtTamper);
  let sends = 0;
  await assert.rejects(sendAuthorizedOpsTeardownEmail({
    authorization: `Bearer ${accessToken("email")}`,
    body: {},
    siteOrigin: "https://preview.example.com",
  }, {
    ...harness.value,
    sendEmail: (async () => {
      sends += 1;
      return { id: "must-not-send", filename: "must-not-render.pdf" };
    }) as OpsTeardownEmailDependencies["sendEmail"],
  }), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
  assert.equal(sends, 0);
}

{
  const reboundTamper = structuredClone(paidOrder);
  reboundTamper.snapshot.admitted_at = "2026-08-22T21:00:01.000Z";
  reboundTamper.snapshot.digest = calculateOpsDragAdmittedSnapshotDigest(reboundTamper.snapshot);
  reboundTamper.payment!.snapshotDigest = reboundTamper.snapshot.digest;
  const harness = dependencies(reboundTamper);
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken("view")}`,
    purpose: "view",
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

for (const admittedAtCandidate of [
  undefined,
  "not-a-time",
  "2026-08-22T17:00:00-04:00",
  "2026-08-22T21:00:00Z",
]) {
  assert.throws(() => createAdmittedSnapshot(
    admittedLead,
    leadId,
    admittedAtCandidate as unknown as string,
  ), /canonical UTC ISO-8601 milliseconds/);
}

for (const mutate of [
  (order: OpsDragOrder) => { delete (order.snapshot as Partial<typeof order.snapshot>).admitted_at; },
  (order: OpsDragOrder) => { order.snapshot.admitted_at = "not-a-time"; },
  (order: OpsDragOrder) => { order.snapshot.admitted_at = "2026-08-22T17:00:00-04:00"; },
  (order: OpsDragOrder) => {
    (order.snapshot as unknown as Record<string, unknown>).digest_contract_version = "unknown";
  },
  (order: OpsDragOrder) => { delete (order.snapshot as Partial<typeof order.snapshot>).digest_contract_version; },
]) {
  const invalidOrder = structuredClone(paidOrder);
  mutate(invalidOrder);
  const harness = dependencies(invalidOrder);
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${accessToken("view")}`,
    purpose: "view",
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

for (const token of [
  rewriteAndSignClaim(accessToken("view"), (claims) => { delete claims.snapshot_digest_version; }),
  rewriteAndSignClaim(accessToken("view"), (claims) => { claims.snapshot_digest_version = "unknown"; }),
]) {
  const harness = dependencies();
  await assert.rejects(loadAuthorizedOpsTeardown({
    authorization: `Bearer ${token}`,
    purpose: "view",
  }, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
}

for (const invalid of [
  { authorization: null, purpose: "view" as const },
  { authorization: `Bearer ${accessToken("pdf")}`, purpose: "view" as const },
  { authorization: `Bearer ${accessToken("view").slice(0, -1)}x`, purpose: "view" as const },
]) {
  const harness = dependencies();
  await assert.rejects(loadAuthorizedOpsTeardown(invalid, harness.value), /access denied/);
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
}

const accessSource = readFileSync("lib/ops-teardown/authorized-access.ts", "utf8");
assert.doesNotMatch(accessSource, /mapLeadRowToTeardownInput|work_email|raw_answers|company_name/);
assert.doesNotMatch(accessSource, /console\.(?:log|warn|error)/);

console.log(
  "OPS_TEARDOWN_SNAPSHOT_IMMUTABILITY_PASS admitted_at=DIGEST_BOUND digest_version=V2 view_pdf_email=SNAPSHOT_ONLY recipient=ORDER_BOUND tamper=REJECTED",
);
