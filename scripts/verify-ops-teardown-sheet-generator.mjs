/**
 * Gate B static proof: ops_teardown_sheet_generator_v1
 * Run: node scripts/verify-ops-teardown-sheet-generator.mjs
 */
import assert from "node:assert/strict";
import {
  buildOpsTeardownSheet,
  getPreQualDragAssessment,
  mapLeadRowToTeardownInput,
} from "../lib/ops-teardown/build-teardown-sheet.js";

const HIGH_PRE_QUAL = {
  session_id: "pq-high-001",
  score: 14,
  band: "high",
  answers: [
    { question_id: "team-size", prompt: "Team size?", label: "15-24", score: 3 },
    { question_id: "founder-routes", prompt: "Founder routes?", label: "Yes", score: 3 },
  ],
};

const MODERATE_PRE_QUAL = {
  session_id: "pq-mod-001",
  score: 9,
  band: "moderate",
  answers: [
    { question_id: "team-size", prompt: "Team size?", label: "10-14", score: 2 },
    { question_id: "founder-routes", prompt: "Founder routes?", label: "Sometimes", score: 2 },
  ],
};

const LOW_PRE_QUAL = {
  session_id: "pq-low-001",
  score: 4,
  band: "low",
  answers: [
    { question_id: "team-size", prompt: "Team size?", label: "1-4", score: 0 },
    { question_id: "founder-routes", prompt: "Founder routes?", label: "No", score: 0 },
  ],
};

const BASE_QUIZ = {
  fullName: "Jane Smith",
  workEmail: "jane@acme.example",
  companyName: "Acme Ops Inc",
  companyWebsite: "https://acme.example",
  businessModel: "Service business",
  companyStage: "Growing team",
  primaryPainArea: "Client delivery",
  highestCostBottleneck: "Manual handoffs causing delays",
  highestCostBottleneckOther: "",
  workflowManagement: ["Spreadsheets", "Slack threads"],
  frequentBreakdown: "Handoffs between sales and delivery",
  frequentBreakdownDetail: "Scope changes disappear between teams",
  urgencyWindow: "Now (0-30 days)",
  quarterRisk: "Revenue risk increases",
  implementationOwnership: "Shared involvement: we collaborate with weekly checkpoints",
  budgetRange: "Yes — that works for us",
  approvalInvolvement: "Owner can approve immediately",
};

function buildFixture(preQual, qualificationScore = 12) {
  return buildOpsTeardownSheet({
    leadId: "11111111-2222-4333-8444-555555555555",
    quizPayload: BASE_QUIZ,
    preQual,
    qualificationScore,
    generatedAt: "2026-06-07T12:00:00.000Z",
  });
}

const highSheet = buildFixture(HIGH_PRE_QUAL);
const moderateSheet = buildFixture(MODERATE_PRE_QUAL);
const lowSheet = buildFixture(LOW_PRE_QUAL);

assert.equal(highSheet.version, "v1");
assert.equal(highSheet.company_name, "Acme Ops Inc");
assert.equal(highSheet.ops_drag_title, "High Operational Drag");
assert.equal(highSheet.ops_drag_score, 14);
assert.equal(highSheet.sections.length, 7);
assert.ok(highSheet.sections.some((section) => section.id === "constraint-map"));
assert.ok(highSheet.sections.some((section) => section.id === "recommended-focus"));
assert.ok(highSheet.priority_actions.length >= 2);

assert.equal(moderateSheet.ops_drag_title, "Moderate Operational Drag");
assert.equal(lowSheet.ops_drag_title, "Low to Moderate Drag");

const mapped = mapLeadRowToTeardownInput(
  {
    id: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
    full_name: "Jane Smith",
    work_email: "jane@acme.example",
    company_name: "Acme Ops Inc",
    company_website: "https://acme.example",
    business_model: "Service business",
    company_stage: "Growing team",
    primary_pain_area: "Client delivery",
    highest_cost_bottleneck: "Manual handoffs causing delays",
    highest_cost_bottleneck_other: null,
    workflow_management: ["Spreadsheets"],
    frequent_breakdown: "Handoffs between sales and delivery",
    frequent_breakdown_detail: "Scope changes disappear",
    urgency_window: "Now (0-30 days)",
    quarter_risk: "Revenue risk increases",
    implementation_ownership: "Shared involvement: we collaborate with weekly checkpoints",
    budget_range: "Yes — that works for us",
    approval_involvement: "Owner can approve immediately",
    raw_answers: BASE_QUIZ,
    metadata: {
      qualification_score: 11,
      pre_qual: HIGH_PRE_QUAL,
    },
  },
  "11111111-2222-4333-8444-555555555555"
);

const mappedSheet = buildOpsTeardownSheet(mapped);
assert.equal(mappedSheet.lead_id, "11111111-2222-4333-8444-555555555555");
assert.equal(mappedSheet.meta.qualification_score, 11);
assert.equal(mappedSheet.meta.pre_qual_session_id, "pq-high-001");

assert.equal(getPreQualDragAssessment(13).band, "high");
assert.equal(getPreQualDragAssessment(8).band, "moderate");
assert.equal(getPreQualDragAssessment(3).band, "low");

console.log(
  JSON.stringify(
    {
      gate: "ops_teardown_sheet_generator_v1",
      state: "CODE_PASS",
      checks_passed: 16,
      fixtures: {
        high_drag_title: highSheet.ops_drag_title,
        moderate_drag_title: moderateSheet.ops_drag_title,
        low_drag_title: lowSheet.ops_drag_title,
        section_ids: highSheet.sections.map((section) => section.id),
        recommended_package: highSheet.recommended_package,
      },
    },
    null,
    2
  )
);
