import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
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

const leadId = "f53f4be4-04f6-4bb0-a145-72f37bb2f1de";
const email = "owner@example.com";
const issuedAt = "2026-08-22T20:00:00.000Z";
const expiresAt = "2026-08-22T20:10:00.000Z";
const secret = "fixture-order-token-secret-at-least-32-chars";
const client = {} as SupabaseClient;

function createPaidOrder(): OpsDragOrder {
  const snapshot = createAdmittedSnapshot({
    id: leadId,
    work_email: email,
    company_name: "Example Operations",
    primary_pain_area: "Handoffs",
    raw_answers: {},
    metadata: {},
  }, leadId, issuedAt);
  const order = createAdmittedOrder(snapshot);
  return claimFulfillmentOwnership(order, {
    checkoutSessionId: "cs_test_bound_checkout",
    paymentReferenceId: "pi_test_bound_payment",
    webhookEventId: "evt_test_bound_payment",
    paidAt: issuedAt,
    amountTotal: 2_900,
    currency: "usd",
    customerEmailSha256: sha256(email),
    snapshotDigest: snapshot.digest,
  }, issuedAt).order;
}

const order = createPaidOrder();
const row = {
  id: leadId,
  ops_drag_report_order: order,
};

function token(purpose: "view" | "pdf" | "email", overrides: { expiresAt?: string } = {}): string {
  return createOpsTeardownAccessToken({
    order,
    purpose,
    tokenId: `token-${purpose}-fixture-0001`,
    issuedAt,
    expiresAt: overrides.expiresAt ?? expiresAt,
    secret,
  });
}

function tamperClaim(signedToken: string, key: string, value: string): string {
  const parts = signedToken.split(".");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  claims[key] = value;
  parts[1] = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return parts.join(".");
}

function accessHarness(overrides: Partial<OpsTeardownAccessDependencies> = {}) {
  const counters = { clients: 0, reads: 0 };
  const dependencies: OpsTeardownAccessDependencies = {
    createClient: () => {
      counters.clients += 1;
      return client;
    },
    fetchRow: async (_client, requestedLeadId) => {
      counters.reads += 1;
      assert.equal(requestedLeadId, leadId);
      return row;
    },
    signingSecret: () => secret,
    now: () => "2026-08-22T20:05:00.000Z",
    ...overrides,
  };
  return { counters, dependencies };
}

for (const invalid of [
  { authorization: null, purpose: "view" as const },
  { authorization: `Bearer ${token("pdf")}`, purpose: "view" as const },
  { authorization: `Bearer ${token("view").slice(0, -1)}x`, purpose: "view" as const },
]) {
  const harness = accessHarness();
  await assert.rejects(loadAuthorizedOpsTeardown(invalid, harness.dependencies), /access denied/);
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
}

for (const [claim, replacement] of [
  ["lead_id", "11111111-2222-4333-8444-555555555555"],
  ["order_id", "odr_11111111111111111111111111111111"],
  ["checkout_session_id", "cs_test_wrong_checkout"],
  ["payment_reference_id", "pi_test_wrong_payment"],
  ["recipient_sha256", "1".repeat(64)],
] as const) {
  const harness = accessHarness();
  await assert.rejects(
    loadAuthorizedOpsTeardown({
      authorization: `Bearer ${tamperClaim(token("view"), claim, replacement)}`,
      purpose: "view",
    }, harness.dependencies),
    /access denied/,
  );
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 }, `${claim} mismatch must fail before DB access`);
}

{
  const harness = accessHarness({ now: () => "2026-08-22T20:10:00.001Z" });
  await assert.rejects(
    loadAuthorizedOpsTeardown({ authorization: `Bearer ${token("view")}`, purpose: "view" }, harness.dependencies),
    /access denied/,
  );
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
}

{
  const harness = accessHarness({ signingSecret: () => "" });
  await assert.rejects(
    loadAuthorizedOpsTeardown({ authorization: `Bearer ${token("view")}`, purpose: "view" }, harness.dependencies),
    /access unavailable/,
  );
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
}

{
  const harness = accessHarness();
  const authorized = await loadAuthorizedOpsTeardown(
    { authorization: `Bearer ${token("view")}`, purpose: "view" },
    harness.dependencies,
  );
  assert.equal(authorized.recipientEmail, email);
  assert.equal(authorized.order.order_id, order.order_id);
  assert.equal(authorized.sheet.company_name, "Example Operations");
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

for (const body of [
  { lead_id: leadId },
  { email },
  { to_email: "attacker@example.com" },
  { order_id: order.order_id },
  { checkout_session_id: order.payment?.checkoutSessionId },
]) {
  const harness = accessHarness();
  let sends = 0;
  const dependencies: OpsTeardownEmailDependencies = {
    ...harness.dependencies,
    sendEmail: (async () => {
      sends += 1;
      return { id: "email-fixture", filename: "fixture.pdf" };
    }) as OpsTeardownEmailDependencies["sendEmail"],
  };
  await assert.rejects(
    sendAuthorizedOpsTeardownEmail({
      authorization: `Bearer ${token("email")}`,
      body,
      siteOrigin: "https://preview.example.com",
    }, dependencies),
    /access denied/,
  );
  assert.deepEqual(harness.counters, { clients: 0, reads: 0 });
  assert.equal(sends, 0);
}

{
  const harness = accessHarness();
  let recipient = "";
  const dependencies: OpsTeardownEmailDependencies = {
    ...harness.dependencies,
    sendEmail: (async (input) => {
      recipient = input.toEmail;
      return { id: "email-fixture", filename: "fixture.pdf" };
    }) as OpsTeardownEmailDependencies["sendEmail"],
  };
  await sendAuthorizedOpsTeardownEmail({
    authorization: `Bearer ${token("email")}`,
    body: {},
    siteOrigin: "https://preview.example.com",
  }, dependencies);
  assert.equal(recipient, email, "email recipient must come from the signed paid-order binding");
  assert.deepEqual(harness.counters, { clients: 1, reads: 1 });
}

const serializedTokens = [token("view"), token("pdf"), token("email")].join("|");
assert.equal(serializedTokens.includes(email), false);
assert.equal(serializedTokens.includes(order.order_id), false, "claims are encoded rather than exposed as URL query data");

for (const routePath of [
  "app/api/studioflows/ops-teardown/route.js",
  "app/api/studioflows/ops-teardown/pdf/route.js",
  "app/api/studioflows/ops-teardown/email/route.ts",
]) {
  const source = readFileSync(routePath, "utf8");
  assert.match(source, /authorization/i);
  assert.doesNotMatch(source, /searchParams|get\(["'](?:lead_id|email)["']\)|to_email/);
  assert.doesNotMatch(source, /createMarketingSupabaseServerClient|fetchLeadRow/);
}
const teardownLoaderSource = readFileSync("lib/ops-teardown/load-teardown-sheet.js", "utf8");
assert.doesNotMatch(teardownLoaderSource, /select\(["']\*["']\)/);
assert.match(teardownLoaderSource, /ops_drag_report_order:metadata->ops_drag_report_order/);
assert.doesNotMatch(readFileSync("lib/ops-teardown/send-teardown-email.js", "utf8"), /share_url|View your teardown online/);

console.log(
  "OPS_TEARDOWN_AUTHORIZATION_PASS unsigned_expired_purpose_tamper=PRE_DB_REJECT recipient=ORDER_BOUND raw_identifiers=ABSENT",
);
