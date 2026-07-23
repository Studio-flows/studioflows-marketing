import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAttributedDestination,
  classifyOutreachRequest,
  createOutreachToken,
  hashUserAgent,
  verifyOutreachToken,
} from "../lib/outreach-link.mjs";

const secret = "test-secret-that-is-intentionally-longer-than-thirty-two-characters";

const payload = {
  destination: "https://os.studioflows.co/s/app?lead_id=lead-1",
  message_id: "msg_001",
  prospect_id: "prospect_001",
  campaign_id: "dfw-rem-001",
  experiment_id: "dfw-rem-email-002",
  variant_id: "cta-score",
  correlation_id: "corr_001",
  market_cell: "dfw-north-dallas-collin",
  vertical: "real-estate-media",
  issued_at: 1784826000,
  expires_at: 1785430800,
};

test("opaque token round-trips without exposing payload identifiers", () => {
  const token = createOutreachToken(payload, secret);
  assert.match(token, /^v1\.[A-Za-z0-9_-]+$/);
  assert.equal(token.includes(payload.prospect_id), false);
  assert.equal(token.includes(payload.destination), false);

  const decoded = verifyOutreachToken(token, secret, 1784827000);
  assert.deepEqual(decoded, { version: 1, ...payload });
});

test("tampered token is rejected", () => {
  const token = createOutreachToken(payload, secret);
  const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.throws(() => verifyOutreachToken(tampered, secret, 1784827000));
});

test("expired token is rejected", () => {
  const token = createOutreachToken(payload, secret);
  assert.throws(
    () => verifyOutreachToken(token, secret, payload.expires_at + 1),
    /expired/
  );
});

test("destination is allowlisted and receives deterministic attribution", () => {
  const url = buildAttributedDestination(payload);
  assert.equal(url.origin, "https://os.studioflows.co");
  assert.equal(url.pathname, "/s/app");
  assert.equal(url.searchParams.get("lead_id"), "lead-1");
  assert.equal(url.searchParams.get("utm_source"), "studioflows_outreach");
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), payload.campaign_id);
  assert.equal(url.searchParams.get("utm_content"), payload.variant_id);
  assert.equal(url.searchParams.get("utm_term"), payload.market_cell);
  assert.equal(url.searchParams.get("sf_experiment"), payload.experiment_id);
  assert.equal(url.searchParams.get("sf_variant"), payload.variant_id);
  assert.equal(url.searchParams.get("sf_cid"), payload.correlation_id);
});

test("unapproved destination origin is rejected", () => {
  assert.throws(
    () => buildAttributedDestination({ ...payload, destination: "https://example.com/phish" }),
    /not allowed/
  );
});

test("scanner-like requests are classified separately from human clicks", () => {
  assert.deepEqual(classifyOutreachRequest("Mozilla/5.0", "GET"), {
    is_bot: false,
    reason: "none",
  });
  assert.equal(classifyOutreachRequest("Proofpoint URL Defense", "GET").is_bot, true);
  assert.equal(classifyOutreachRequest("Mozilla/5.0", "HEAD").is_bot, true);
  assert.equal(classifyOutreachRequest("", "GET").is_bot, true);
});

test("user-agent hash is deterministic without storing raw user agent", () => {
  const ua = "Mozilla/5.0 test";
  assert.equal(hashUserAgent(ua), hashUserAgent(ua));
  assert.equal(hashUserAgent(ua).length, 64);
  assert.notEqual(hashUserAgent(ua), ua);
});
