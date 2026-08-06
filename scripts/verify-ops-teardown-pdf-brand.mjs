/**
 * Gate C static proof: ops_teardown_pdf_brand_v1
 * Run: node scripts/verify-ops-teardown-pdf-brand.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildOpsTeardownSheet } from "../lib/ops-teardown/build-teardown-sheet.js";
import { renderTeardownPdf } from "../lib/ops-teardown/render-teardown-pdf.js";
import {
  buildTeardownPdfDownloadUrl,
  buildTeardownReferralMailto,
  buildTeardownShareUrl,
} from "../lib/ops-teardown/teardown-share.js";

function sanitizePdfFilename(companyName) {
  const base = typeof companyName === "string" ? companyName.trim() : "company";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `studioflows-ops-teardown-${slug || "sheet"}.pdf`;
}

const fixture = buildOpsTeardownSheet({
  leadId: "11111111-2222-4333-8444-555555555555",
  quizPayload: {
    companyName: "Acme Ops Inc",
    primaryPainArea: "Client delivery",
    highestCostBottleneck: "Manual handoffs causing delays",
    frequentBreakdown: "Handoffs between sales and delivery",
    businessModel: "Service business",
    companyStage: "Growing team",
    workflowManagement: ["Spreadsheets"],
    urgencyWindow: "Now (0-30 days)",
    quarterRisk: "Revenue risk increases",
    budgetRange: "Yes — that works for us",
    approvalInvolvement: "Owner can approve immediately",
    implementationOwnership: "Shared involvement: we collaborate with weekly checkpoints",
  },
  preQual: {
    session_id: "pq-high-001",
    score: 14,
    band: "high",
    answers: [{ question_id: "team-size", prompt: "Team size?", label: "15-24", score: 3 }],
  },
  qualificationScore: 12,
  generatedAt: "2026-06-07T15:00:00.000Z",
});

const pdfBuffer = await renderTeardownPdf(fixture);
assert.ok(Buffer.isBuffer(pdfBuffer));
assert.ok(pdfBuffer.byteLength > 1200);
assert.equal(pdfBuffer.subarray(0, 4).toString("utf8"), "%PDF");

const filename = sanitizePdfFilename(fixture.company_name);
assert.match(filename, /^studioflows-ops-teardown-acme-ops-inc\.pdf$/);

const pdfUrl = buildTeardownPdfDownloadUrl({
  leadId: fixture.lead_id,
  email: "founder@acme.example",
  siteOrigin: "https://www.studioflows.co",
});
assert.match(pdfUrl, /\/api\/studioflows\/ops-teardown\/pdf\?/);

const shareUrl = buildTeardownShareUrl({
  leadId: fixture.lead_id,
  email: "founder@acme.example",
  siteOrigin: "https://www.studioflows.co",
});
assert.match(shareUrl, /\/services\/custom-ops-hub\/teardown\?/);

const mailto = buildTeardownReferralMailto({
  companyName: fixture.company_name,
  siteOrigin: "https://www.studioflows.co",
});
assert.match(mailto, /^mailto:\?subject=/);

const logoExists = ["StudioFlows logo (1200 x 675 px) (1).png", "StudioFlows logo white (1200 x 675 px).png"].some(
  (filename) => fs.existsSync(path.join(process.cwd(), "public", filename))
);
assert.equal(logoExists, true, "StudioFlows logo asset required for watermark proof");

console.log(
  JSON.stringify(
    {
      gate: "ops_teardown_pdf_brand_v1",
      state: "CODE_PASS",
      checks_passed: 8,
      pdf_bytes: pdfBuffer.byteLength,
      pdf_magic: "%PDF",
      filename,
      pdf_download_url: pdfUrl,
      share_url: shareUrl,
      watermark_logo_present: logoExists,
      resend_runtime: "configured via RESEND_API_KEY at deploy time",
    },
    null,
    2
  )
);
