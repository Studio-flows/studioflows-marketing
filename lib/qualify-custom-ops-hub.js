export const QUALIFICATION_MIN_SCORE = 8;

export function evaluateQualification(answers) {
  let score = 0;
  const reasons = [];

  const urgencyScoreMap = {
    "Now: 0–30 days": 3,
    "Near term: 1–3 months": 2,
    "This quarter": 1,
    "This year": 0,
  };
  const budgetScoreMap = {
    "Yes — that works for us": 3,
    "Yes, with a couple of questions": 3,
    "Need to confirm with a partner first": 1,
    "Not the right time": 0,
  };
  const approvalScoreMap = {
    "Owner can approve immediately": 3,
    "Owner + one stakeholder": 2,
    "Needs team review this month": 1,
    "Needs quarter planning cycle": 0,
  };
  const involvementScoreMap = {
    "Low involvement: I want StudioFlows to handle most of it": 2,
    "Shared involvement: we collaborate with weekly checkpoints": 2,
    "High involvement: I want a strategy/blueprint first, then decide next steps": 1,
  };

  score += urgencyScoreMap[answers.urgencyWindow] || 0;
  score += budgetScoreMap[answers.budgetRange] || 0;
  score += approvalScoreMap[answers.approvalInvolvement] || 0;
  score += involvementScoreMap[answers.implementationOwnership] || 0;

  if (answers.quarterRisk === "Revenue risk increases" || answers.quarterRisk === "Delivery quality degrades") {
    score += 1;
  }

  if (answers.budgetRange === "Not the right time") {
    reasons.push("pricing_not_now");
  }
  if (answers.approvalInvolvement === "Needs quarter planning cycle") {
    reasons.push("slow_approval_cycle");
  }
  if (answers.urgencyWindow === "This year") {
    reasons.push("low_urgency_window");
  }

  const qualified = score >= QUALIFICATION_MIN_SCORE;
  return { qualified, score, reasons };
}

export function tierFromBudget(budgetRange) {
  if (typeof budgetRange !== "string") return null;
  const map = {
    "Yes — that works for us": "founder",
    "Yes, with a couple of questions": "founder",
    "Need to confirm with a partner first": "founder",
    "Not the right time": null,
  };
  return map[budgetRange.trim()] ?? null;
}

export function getMarketingBucket({ score, reasons }) {
  if (reasons.includes("pricing_not_now")) return "low_budget_nurture";
  if (reasons.includes("low_urgency_window")) return "long_timeline_nurture";
  if (reasons.includes("slow_approval_cycle")) return "approval_friction_nurture";
  if (score >= 6) return "warm_nurture";
  return "education_nurture";
}

export function getOutreachNextSteps(bucket) {
  const steps = {
    low_budget_nurture: [
      "We saved your answers and your founder-pricing eligibility for when the timing is right.",
      "Watch for practical ops content focused on quick wins you can act on now.",
      "Re-run the check whenever you're ready to start — founding-member pricing still applies.",
    ],
    long_timeline_nurture: [
      "We saved your answers for a longer-cycle nurture track.",
      "You will get periodic check-ins tied to planning windows, not pushy sales pings.",
      "Revisit the qualifier when timing moves inside 90 days.",
    ],
    approval_friction_nurture: [
      "We saved your answers and noted approval friction as the main constraint.",
      "Outreach will focus on decision-ready materials you can share with stakeholders.",
      "Come back when budget and sign-off path are aligned.",
    ],
    warm_nurture: [
      "You are close on fit. We saved your answers for a warm follow-up sequence.",
      "Expect targeted notes on the bottleneck you flagged, not generic marketing.",
      "Re-run the qualifier if urgency or budget changes.",
    ],
    education_nurture: [
      "We saved your answers for education-first outreach.",
      "You will get resources on operational drag patterns before any build conversation.",
      "Return when execution pain becomes a near-term priority.",
    ],
  };
  return steps[bucket] ?? steps.education_nurture;
}

export function splitName(fullName) {
  if (typeof fullName !== "string") return { first_name: null, last_name: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function baseCustomOpsHubLeadFields(raw) {
  return {
    full_name: String(raw.fullName ?? "").trim(),
    work_email: String(raw.workEmail ?? "").trim().toLowerCase(),
    company_name: String(raw.companyName ?? "").trim(),
    company_website: String(raw.companyWebsite ?? "").trim() || null,
    business_model: raw.businessModel,
    company_stage: raw.companyStage,
    primary_pain_area: raw.primaryPainArea,
    highest_cost_bottleneck: raw.highestCostBottleneck,
    highest_cost_bottleneck_other: String(raw.highestCostBottleneckOther ?? "").trim() || null,
    workflow_management: Array.isArray(raw.workflowManagement) ? raw.workflowManagement : [],
    frequent_breakdown: raw.frequentBreakdown,
    frequent_breakdown_detail: String(raw.frequentBreakdownDetail ?? "").trim(),
    urgency_window: raw.urgencyWindow,
    quarter_risk: raw.quarterRisk,
    implementation_ownership: raw.implementationOwnership,
    budget_range: raw.budgetRange,
    approval_involvement: raw.approvalInvolvement,
    source_page: "services/custom-ops-hub",
    raw_answers: raw,
  };
}

export function buildDisqualifiedLeadRow(raw, qualification, marketingBucket, outreachNextSteps) {
  return {
    ...baseCustomOpsHubLeadFields(raw),
    status: "disqualified",
    metadata: {
      path: "/services/custom-ops-hub",
      qualification_score: qualification.score,
      qualification_reasons: qualification.reasons,
      qualification_version: "v1",
      marketing_bucket: marketingBucket,
      outreach_next_steps: outreachNextSteps,
      recommended_tier: tierFromBudget(raw.budgetRange),
    },
  };
}

export function buildQualifiedLeadRow(raw, qualification, tier) {
  return {
    ...baseCustomOpsHubLeadFields(raw),
    status: "qualified",
    metadata: {
      path: "/services/custom-ops-hub",
      qualification_score: qualification.score,
      qualification_reasons: qualification.reasons,
      qualification_version: "v1",
      recommended_tier: tier ?? tierFromBudget(raw.budgetRange),
    },
  };
}
