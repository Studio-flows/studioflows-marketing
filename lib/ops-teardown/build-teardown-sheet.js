/**
 * @typedef {Object} TeardownSheetSection
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string[]} [bullets]
 * @property {string[]} [highlights]
 */

/**
 * @typedef {Object} OpsTeardownSheet
 * @property {"v1"} version
 * @property {string} generated_at
 * @property {string | null} lead_id
 * @property {string} company_name
 * @property {string} ops_drag_title
 * @property {string} ops_drag_summary
 * @property {number | null} ops_drag_score
 * @property {number} ops_drag_max
 * @property {string | null} ops_drag_band
 * @property {string} recommended_focus
 * @property {string} recommended_package
 * @property {string[]} priority_actions
 * @property {TeardownSheetSection[]} sections
 * @property {Record<string, unknown>} meta
 */

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

export function getPreQualDragAssessment(score) {
  const normalized = typeof score === "number" && Number.isFinite(score) ? score : null;
  if (normalized == null) {
    return {
      title: "Operational Drag Snapshot",
      summary: "Pre-qualifier score unavailable — full qualifier answers still shape this teardown.",
      band: null,
    };
  }
  if (normalized >= 13) {
    return {
      title: "High Operational Drag",
      summary:
        "You likely have margin leakage and founder bottlenecking in your core execution flow.",
      band: "high",
    };
  }
  if (normalized >= 8) {
    return {
      title: "Moderate Operational Drag",
      summary: "You have partial structure, but handoffs and ownership still leak execution.",
      band: "moderate",
    };
  }
  return {
    title: "Low to Moderate Drag",
    summary: "Execution drag exists, but may be contained to specific handoffs rather than the whole system.",
    band: "low",
  };
}

function recommendedPackageFromBudget(budgetRange) {
  const budget = readString(budgetRange);
  if (!budget) return "Founders Ops Hub — confirm scope on discovery call";
  if (budget.includes("Not the right time")) {
    return "Founders waitlist + education track until timing aligns";
  }
  if (budget.includes("questions") || budget.includes("partner")) {
    return "Founders Ops Hub — start with subscription, expand scope after discovery";
  }
  return "Founders Ops Hub — founding-member pricing ($99 first month, then $199/mo)";
}

function constraintSummary(payload) {
  const pain = readString(payload.primaryPainArea);
  const bottleneck = readString(payload.highestCostBottleneck);
  const breakdown = readString(payload.frequentBreakdown);
  const breakdownDetail = readString(payload.frequentBreakdownDetail);
  const bullets = [pain, bottleneck, breakdown].filter(Boolean);
  if (breakdownDetail) bullets.push(breakdownDetail);
  return bullets;
}

function workflowSummary(payload) {
  const workflows = readStringArray(payload.workflowManagement);
  const businessModel = readString(payload.businessModel);
  const companyStage = readString(payload.companyStage);
  const ownership = readString(payload.implementationOwnership);
  return {
    bullets: [
      businessModel ? `Business model: ${businessModel}` : null,
      companyStage ? `Company stage: ${companyStage}` : null,
      workflows.length ? `Work currently runs through: ${workflows.join(", ")}` : null,
      ownership ? `Implementation preference: ${ownership}` : null,
    ].filter(Boolean),
  };
}

function quarterRiskSummary(payload) {
  const urgency = readString(payload.urgencyWindow);
  const quarterRisk = readString(payload.quarterRisk);
  const approval = readString(payload.approvalInvolvement);
  return {
    bullets: [urgency, quarterRisk, approval ? `Approval path: ${approval}` : null].filter(Boolean),
  };
}

function buildPriorityActions(payload, preQualAssessment) {
  const actions = [];
  const pain = readString(payload.primaryPainArea);
  const bottleneck = readString(payload.highestCostBottleneck);

  if (preQualAssessment.band === "high") {
    actions.push("Stabilize founder-routed handoffs before adding more tools or headcount.");
  }
  if (pain) actions.push(`Design the first workflow map around ${pain.toLowerCase()}.`);
  if (bottleneck) actions.push(`Remove ${bottleneck.toLowerCase()} as the first constraint to attack.`);
  actions.push("Book a focused ops audit to validate scope before any build decision.");

  return [...new Set(actions)].slice(0, 4);
}

function formatPreQualAnswers(preQual) {
  if (!preQual || typeof preQual !== "object" || !Array.isArray(preQual.answers)) return [];
  return preQual.answers
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const prompt = readString(entry.prompt);
      const label = readString(entry.label);
      if (!prompt || !label) return null;
      return `${prompt} → ${label}`;
    })
    .filter(Boolean);
}

/**
 * @param {{
 *   leadId?: string | null;
 *   quizPayload: Record<string, unknown>;
 *   preQual?: Record<string, unknown> | null;
 *   qualificationScore?: number | null;
 *   generatedAt?: string;
 * }} input
 * @returns {OpsTeardownSheet}
 */
export function buildOpsTeardownSheet(input) {
  const quizPayload = input.quizPayload ?? {};
  const preQual = input.preQual ?? null;
  const companyName = readString(quizPayload.companyName) ?? "Your company";
  const preQualScore =
    typeof preQual?.score === "number"
      ? preQual.score
      : typeof preQual?.score === "string"
        ? Number(preQual.score)
        : null;
  const preQualAssessment = getPreQualDragAssessment(
    Number.isFinite(preQualScore) ? preQualScore : null
  );
  const qualificationScore =
    typeof input.qualificationScore === "number" ? input.qualificationScore : null;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const constraintBullets = constraintSummary(quizPayload);
  const workflow = workflowSummary(quizPayload);
  const quarterRisk = quarterRiskSummary(quizPayload);
  const recommendedPackage = recommendedPackageFromBudget(quizPayload.budgetRange);
  const priorityActions = buildPriorityActions(quizPayload, preQualAssessment);
  const preQualLines = formatPreQualAnswers(preQual);

  /** @type {OpsTeardownSheet} */
  const sheet = {
    version: "v1",
    generated_at: generatedAt,
    lead_id: input.leadId ?? null,
    company_name: companyName,
    ops_drag_title: preQualAssessment.title,
    ops_drag_summary: preQualAssessment.summary,
    ops_drag_score: Number.isFinite(preQualScore) ? preQualScore : null,
    ops_drag_max: 18,
    ops_drag_band: preQual?.band ?? preQualAssessment.band,
    recommended_focus:
      readString(quizPayload.primaryPainArea) ??
      "Map the highest-cost bottleneck and assign one owner per workflow stage.",
    recommended_package: recommendedPackage,
    priority_actions: priorityActions,
    sections: [
      {
        id: "cover",
        title: "Ops Teardown — Confidential",
        body: `${companyName} · Generated ${new Date(generatedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`,
        highlights: ["StudioFlows", "Ops Teardown"],
      },
      {
        id: "ops-drag-snapshot",
        title: preQualAssessment.title,
        body: preQualAssessment.summary,
        bullets: [
          Number.isFinite(preQualScore) ? `Ops Drag Snapshot: ${preQualScore} / 18` : null,
          preQualLines.length ? "Homepage pre-qualifier signals:" : null,
          ...preQualLines,
        ].filter(Boolean),
      },
      {
        id: "constraint-map",
        title: "Constraint Map",
        body: "These are the execution constraints we would design against first.",
        bullets: constraintBullets.length
          ? constraintBullets
          : ["Qualifier did not capture a primary constraint — validate on discovery call."],
      },
      {
        id: "workflow-reality",
        title: "Workflow Reality",
        body: "How work actually moves today — not how the org chart says it should.",
        bullets: workflow.bullets.length
          ? workflow.bullets
          : ["Workflow signals were incomplete — confirm systems map on audit."],
      },
      {
        id: "quarter-risk",
        title: "Quarter Risk",
        body: "What breaks if this quarter ends without fixing the constraint.",
        bullets: quarterRisk.bullets.length
          ? quarterRisk.bullets
          : ["Urgency and approval path need validation on the audit call."],
      },
      {
        id: "recommended-focus",
        title: "Recommended Focus",
        body: recommendedPackage,
        bullets: priorityActions,
      },
      {
        id: "next-step",
        title: "Next Step",
        body: "Use this teardown as the pre-read for your ops audit — then decide whether to move into a Founders build.",
        bullets: [
          "Book your ops audit while context is fresh.",
          "Share this sheet with any stakeholder who approves operational investments.",
          "Know someone else with ops drag? Send them to the homepage diagnosis.",
        ],
      },
    ],
    meta: {
      qualification_score: qualificationScore,
      pre_qual_session_id:
        typeof preQual?.session_id === "string" ? preQual.session_id : null,
      business_model: readString(quizPayload.businessModel),
      company_stage: readString(quizPayload.companyStage),
      primary_pain_area: readString(quizPayload.primaryPainArea),
    },
  };

  return sheet;
}

/**
 * Map a marketing `custom_ops_hub_leads` row into generator input.
 * @param {Record<string, unknown>} row
 * @param {string | null} leadId
 */
export function mapLeadRowToTeardownInput(row, leadId = null) {
  const rawAnswers =
    row.raw_answers && typeof row.raw_answers === "object" && !Array.isArray(row.raw_answers)
      ? row.raw_answers
      : {};
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const quizPayload = {
    fullName: row.full_name ?? rawAnswers.fullName,
    workEmail: row.work_email ?? rawAnswers.workEmail,
    companyName: row.company_name ?? rawAnswers.companyName,
    companyWebsite: row.company_website ?? rawAnswers.companyWebsite,
    businessModel: row.business_model ?? rawAnswers.businessModel,
    companyStage: row.company_stage ?? rawAnswers.companyStage,
    primaryPainArea: row.primary_pain_area ?? rawAnswers.primaryPainArea,
    highestCostBottleneck: row.highest_cost_bottleneck ?? rawAnswers.highestCostBottleneck,
    highestCostBottleneckOther:
      row.highest_cost_bottleneck_other ?? rawAnswers.highestCostBottleneckOther,
    workflowManagement: row.workflow_management ?? rawAnswers.workflowManagement,
    frequentBreakdown: row.frequent_breakdown ?? rawAnswers.frequentBreakdown,
    frequentBreakdownDetail: row.frequent_breakdown_detail ?? rawAnswers.frequentBreakdownDetail,
    urgencyWindow: row.urgency_window ?? rawAnswers.urgencyWindow,
    quarterRisk: row.quarter_risk ?? rawAnswers.quarterRisk,
    implementationOwnership: row.implementation_ownership ?? rawAnswers.implementationOwnership,
    budgetRange: row.budget_range ?? rawAnswers.budgetRange,
    approvalInvolvement: row.approval_involvement ?? rawAnswers.approvalInvolvement,
  };

  return {
    leadId: leadId ?? (typeof row.id === "string" ? row.id : null),
    quizPayload,
    preQual:
      metadata.pre_qual && typeof metadata.pre_qual === "object" ? metadata.pre_qual : null,
    qualificationScore:
      typeof metadata.qualification_score === "number" ? metadata.qualification_score : null,
  };
}
