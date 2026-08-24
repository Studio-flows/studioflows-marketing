/**
 * Gate A static proof: ops_teardown_session_handoff_v1
 * Run: node scripts/verify-ops-teardown-session-handoff.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOpsAuditBookUrl,
  buildOpsTeardownContinuationUrl,
  buildOpsTeardownThankYouUrl,
  isOpsTeardownContinuation,
} from "../lib/ops-audit-handoff.js";
import {
  buildPreQualAnswerPayload,
  buildOpsHubUrl,
  mergeLeadAttribution,
  parseLeadAttribution,
  toIngestAttribution,
  toIngestPreQual,
} from "../lib/lead-attribution.js";
import { toCanonicalLeadAttribution } from "../lib/real-estate-media/remLeadAttribution.js";

const LEAD_ID = "11111111-2222-4333-8444-555555555555";
const EMAIL = "founder@acme.example";
const SESSION_ID = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";

// OT-A1: pq_session_id in URL parse + merge
const parsed = parseLeadAttribution(
  `?src=homepage-diagnosis&pq_session_id=${SESSION_ID}&pq_score=14&pq_qualified=true&pq_band=high`
);
assert.equal(parsed.pq_session_id, SESSION_ID);
assert.equal(parsed.pq_score, 14);

const merged = mergeLeadAttribution(parsed, { pq_band: "high", pq_session_id: SESSION_ID });
assert.equal(merged.pq_session_id, SESSION_ID);
const ingestAttr = toIngestAttribution(merged);
assert.equal(ingestAttr.pq_session_id, SESSION_ID);

// OT-A2: pre-qual payload shape
const questions = [
  { id: "team-size", prompt: "Team size?" },
  { id: "founder-routes", prompt: "Founder routes?" },
];
const answers = [
  { label: "10-14", score: 2 },
  { label: "Yes", score: 3 },
];
const preQual = buildPreQualAnswerPayload(questions, answers, 5, "moderate", true);
assert.equal(preQual.answers.length, 2);
assert.equal(preQual.answers[0].question_id, "team-size");
assert.ok(typeof preQual.session_id === "string" && preQual.session_id.length > 8);

const ingestPreQual = toIngestPreQual({ ...preQual, session_id: SESSION_ID });
assert.equal(ingestPreQual.session_id, SESSION_ID);
assert.equal(toIngestPreQual(null), null);

// OT-A4: continue=ops-teardown detection + thank-you URL
assert.equal(
  isOpsTeardownContinuation(`?lead_id=${LEAD_ID}&continue=ops-teardown`),
  true
);
assert.equal(isOpsTeardownContinuation(`?continue=ops-teardown`), false);

const continuationUrl = buildOpsTeardownContinuationUrl({
  leadId: LEAD_ID,
  email: EMAIL,
  from: "homepage-ops-check-qualified",
  siteOrigin: "https://www.studioflows.co",
});
assert.match(continuationUrl, /continue=ops-teardown/);
assert.match(continuationUrl, /lead_id=/);

const thankYouUrl = buildOpsTeardownThankYouUrl({
  leadId: LEAD_ID,
  email: EMAIL,
  from: "homepage-ops-check-qualified",
  siteOrigin: "https://www.studioflows.co",
});
const parsedThankYouUrl = new URL(thankYouUrl);
assert.equal(parsedThankYouUrl.searchParams.get("lead_id"), LEAD_ID);
assert.equal(parsedThankYouUrl.searchParams.has("book_call_url"), false);

// OT-A5: book_call_url + ops_teardown_url builders
const bookUrl = buildOpsAuditBookUrl({
  platformRoot: "https://os.studioflows.co",
  tenantSlug: "app",
  leadId: LEAD_ID,
  email: EMAIL,
  from: "homepage-ops-check-qualified",
});
assert.match(bookUrl, /\/s\/app\/ops-audit\/book\?/);
assert.match(bookUrl, /lead_id=/);

const trimmedBookUrl = buildOpsAuditBookUrl({
  platformRoot: "https://os.studioflows.co/s/app",
  tenantSlug: "app\n",
  leadId: LEAD_ID,
});
assert.equal(trimmedBookUrl.includes("\n"), false);
assert.match(trimmedBookUrl, /^https:\/\/os\.studioflows\.co\/s\/app\/ops-audit\/book\?/);

const rejectedHostBookUrl = buildOpsAuditBookUrl({
  platformRoot: "https://example.invalid/s/app",
  tenantSlug: "app",
  leadId: LEAD_ID,
});
assert.match(rejectedHostBookUrl, /^https:\/\/os\.studioflows\.co\/s\/app\/ops-audit\/book\?/);
assert.equal(
  buildOpsAuditBookUrl({
    platformRoot: "https://os.studioflows.co",
    tenantSlug: "app/other",
    leadId: LEAD_ID,
  }),
  null
);

const remAttribution = toCanonicalLeadAttribution({
  utm_source: "google",
  utm_campaign: "rem-ops",
  landing_path: "/real-estate-media",
});
assert.equal(remAttribution.src, "real-estate-media");
assert.equal(remAttribution.utm_source, "google");
assert.equal(remAttribution.utm_campaign, "rem-ops");
const qualifierUrl = buildOpsHubUrl({
  source: remAttribution.src,
  utm: remAttribution,
});
assert.match(qualifierUrl, /src=real-estate-media/);
assert.match(qualifierUrl, /utm_source=google/);

const qualifiedClientSource = readFileSync(
  new URL("../app/services/custom-ops-hub/CustomOpsHubClient.js", import.meta.url),
  "utf8"
);
assert.match(qualifiedClientSource, /result\.ops_teardown_url/);
assert.doesNotMatch(qualifiedClientSource, /resolveQualifiedOpsAuditRedirect/);

const quickCallSource = readFileSync(
  new URL("../components/home/BookQuickCallButton.js", import.meta.url),
  "utf8"
);
assert.match(quickCallSource, /ingest-ops-check/);
assert.match(quickCallSource, /bookingUrl\.hostname === "os\.studioflows\.co"/);
assert.match(quickCallSource, /Get an Ops Teardown/);
assert.doesNotMatch(quickCallSource, /buildDirectOpsAuditBookUrl|loadBookCallUrl/);

const quickCallIngestSource = readFileSync(
  new URL("../app/api/studioflows/ingest-ops-check/route.ts", import.meta.url),
  "utf8"
);
assert.match(quickCallIngestSource, /buildOpsAuditBookUrl/);
assert.doesNotMatch(quickCallIngestSource, /resolveBookCallUrl/);

const teardownClientSource = readFileSync(
  new URL("../app/services/custom-ops-hub/teardown/OpsTeardownThankYouClient.js", import.meta.url),
  "utf8"
);
assert.match(teardownClientSource, /buildOpsAuditBookUrl\(\{ leadId, email, from \}\)/);
assert.doesNotMatch(teardownClientSource, /book_call_url/);

console.log(
  JSON.stringify(
    {
      gate: "ops_teardown_session_handoff_v1",
      state: "CODE_PASS",
      checks_passed: 33,
      continuation_url: continuationUrl,
      thank_you_url: thankYouUrl,
      book_call_url: bookUrl,
      pre_qual_session_id: SESSION_ID,
    },
    null,
    2
  )
);
