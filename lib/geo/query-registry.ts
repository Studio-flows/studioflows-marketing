export type QueryCluster = "owner-dependency" | "quote-to-job" | "real-estate-media";

export type BuyerIntent =
  | "define-problem"
  | "diagnose-problem"
  | "design-process"
  | "run-audit"
  | "evaluate-system";

export type FunnelStage = "problem-aware" | "solution-aware" | "evaluation";

export type CannibalizationRisk = "low" | "medium" | "high";

export type EvidenceState =
  | "approved-strategy"
  | "live-serp-confirmed-no-volume"
  | "first-party-query-data-pending";

export type QueryDecision = "implemented" | "implement-now" | "brief-next" | "hold-for-evidence";

export type QueryEvidence = {
  source: "approved-plan" | "bing-keyword-research" | "live-measurement-audit";
  observedOn: string;
  state: EvidenceState;
  signal: string;
};

export type QueryTarget = {
  id: string;
  cluster: QueryCluster;
  buyerProblem: string;
  primaryQuery: string;
  secondaryQueries: ReadonlyArray<string>;
  intent: BuyerIntent;
  funnelStage: FunnelStage;
  existingCoverage: ReadonlyArray<string>;
  targetPath: string;
  cannibalizationRisk: CannibalizationRisk;
  differentiation: string;
  evidence: ReadonlyArray<QueryEvidence>;
  decision: QueryDecision;
};

const APPROVED_ON = "2026-08-05";
const RESEARCHED_ON = "2026-08-06";

const approvedPlanEvidence = (signal: string): QueryEvidence => ({
  source: "approved-plan",
  observedOn: APPROVED_ON,
  state: "approved-strategy",
  signal,
});

const pendingFirstPartyEvidence: QueryEvidence = {
  source: "live-measurement-audit",
  observedOn: RESEARCHED_ON,
  state: "first-party-query-data-pending",
  signal:
    "Google Search Console is connected but still processing launch data; no query rows are available yet.",
};

export const QUERY_TO_PAGE_REGISTRY = [
  {
    id: "founder-bottleneck",
    cluster: "owner-dependency",
    buyerProblem: "Decisions and handoffs wait for the founder even when the team has capacity.",
    primaryQuery: "founder bottleneck",
    secondaryQueries: ["owner bottleneck", "owner is the bottleneck", "business owner bottleneck"],
    intent: "diagnose-problem",
    funnelStage: "problem-aware",
    existingCoverage: ["/silent-collapse", "/resources"],
    targetPath: "/resources/founder-bottleneck",
    cannibalizationRisk: "medium",
    differentiation:
      "A crawlable diagnosis-and-repair framework; /silent-collapse remains the interactive diagnostic.",
    evidence: [
      approvedPlanEvidence("Owner bottleneck diagnosis is in the approved Gate 2 owner-dependency cluster."),
      {
        source: "bing-keyword-research",
        observedOn: RESEARCHED_ON,
        state: "live-serp-confirmed-no-volume",
        signal:
          "Bing returned a coherent ten-result founder-bottleneck SERP, but not enough impression data for a trend estimate.",
      },
      pendingFirstPartyEvidence,
    ],
    decision: "implemented",
  },
  {
    id: "business-runs-without-you",
    cluster: "owner-dependency",
    buyerProblem: "The business cannot complete a normal service cycle when the owner is unavailable.",
    primaryQuery: "business can run without you",
    secondaryQueries: [
      "business can't run without me",
      "business runs without owner",
      "owner absence business continuity",
    ],
    intent: "design-process",
    funnelStage: "solution-aware",
    existingCoverage: ["/silent-collapse", "/platform"],
    targetPath: "/resources/business-that-runs-without-you",
    cannibalizationRisk: "low",
    differentiation:
      "A controlled owner-absence continuity test; /platform remains a waitlist and /silent-collapse remains diagnostic.",
    evidence: [
      approvedPlanEvidence("Owner-absence continuity is in the approved Gate 2 owner-dependency cluster."),
      {
        source: "bing-keyword-research",
        observedOn: RESEARCHED_ON,
        state: "live-serp-confirmed-no-volume",
        signal:
          "Bing returned a coherent SERP for businesses that run without the owner, but not enough impression data for a trend estimate.",
      },
      pendingFirstPartyEvidence,
    ],
    decision: "implemented",
  },
  {
    id: "owner-is-the-operating-system",
    cluster: "owner-dependency",
    buyerProblem: "Operating rules exist in the owner's memory instead of in the work.",
    primaryQuery: "owner is the operating system",
    secondaryQueries: ["business depends on owner", "owner dependent business"],
    intent: "define-problem",
    funnelStage: "problem-aware",
    existingCoverage: ["/", "/silent-collapse"],
    targetPath: "/resources/owner-is-the-operating-system",
    cannibalizationRisk: "medium",
    differentiation: "Category definition with an operating-rule inventory, not another bottleneck diagnosis.",
    evidence: [
      approvedPlanEvidence("Owner-is-the-operating-system is in the approved Gate 2 owner-dependency cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "brief-next",
  },
  {
    id: "owner-dependency-audit",
    cluster: "owner-dependency",
    buyerProblem: "The owner needs a repeatable way to locate concentrated operational dependency.",
    primaryQuery: "owner dependency audit",
    secondaryQueries: ["owner dependency assessment", "owner bottleneck assessment"],
    intent: "run-audit",
    funnelStage: "solution-aware",
    existingCoverage: ["/silent-collapse", "/services/custom-ops-hub"],
    targetPath: "/resources/owner-dependency-audit",
    cannibalizationRisk: "high",
    differentiation: "A crawlable audit method that must not duplicate the existing diagnostic or qualifier.",
    evidence: [
      approvedPlanEvidence("Owner-dependency audit is in the approved Gate 2 owner-dependency cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "hold-for-evidence",
  },
  {
    id: "approved-quote-handoff",
    cluster: "quote-to-job",
    buyerProblem: "Approved work loses scope, assumptions, or ownership before scheduling.",
    primaryQuery: "approved quote handoff",
    secondaryQueries: ["quote to job handoff", "estimate to work order process"],
    intent: "design-process",
    funnelStage: "solution-aware",
    existingCoverage: ["/real-estate-media", "/services/custom-ops-hub"],
    targetPath: "/resources/approved-quote-handoff",
    cannibalizationRisk: "low",
    differentiation: "Defines the evidence package required to turn approval into schedulable work.",
    evidence: [
      approvedPlanEvidence("Approved quote handoff is in the approved Gate 2 quote-to-job cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "implement-now",
  },
  {
    id: "work-order-readiness",
    cluster: "quote-to-job",
    buyerProblem: "A work order exists, but the job is not ready for assignment or execution.",
    primaryQuery: "work order readiness",
    secondaryQueries: ["job readiness checklist", "ready to schedule work order"],
    intent: "define-problem",
    funnelStage: "problem-aware",
    existingCoverage: ["/real-estate-media"],
    targetPath: "/resources/work-order-readiness",
    cannibalizationRisk: "low",
    differentiation: "Separates administrative creation from operational readiness for service work.",
    evidence: [
      approvedPlanEvidence("Work-order readiness is in the approved Gate 2 quote-to-job cluster."),
      {
        source: "bing-keyword-research",
        observedOn: RESEARCHED_ON,
        state: "live-serp-confirmed-no-volume",
        signal:
          "Bing showed maintenance-heavy results and insufficient trend data, so service-business positioning needs further validation.",
      },
      pendingFirstPartyEvidence,
    ],
    decision: "hold-for-evidence",
  },
  {
    id: "job-handoff-audit",
    cluster: "quote-to-job",
    buyerProblem: "Teams cannot tell which job handoff introduced delay, rework, or ambiguity.",
    primaryQuery: "job handoff audit",
    secondaryQueries: ["job handoff checklist", "service job handoff process"],
    intent: "run-audit",
    funnelStage: "solution-aware",
    existingCoverage: ["/services/custom-ops-hub"],
    targetPath: "/resources/job-handoff-audit",
    cannibalizationRisk: "medium",
    differentiation: "Audits active service-job transitions rather than employee or shift handovers.",
    evidence: [
      approvedPlanEvidence("Job-handoff audit is in the approved Gate 2 quote-to-job cluster."),
      {
        source: "bing-keyword-research",
        observedOn: RESEARCHED_ON,
        state: "live-serp-confirmed-no-volume",
        signal:
          "Bing results skewed toward employee handover templates and showed insufficient trend data, so the service-job intent is unproven.",
      },
      pendingFirstPartyEvidence,
    ],
    decision: "hold-for-evidence",
  },
  {
    id: "scope-change-propagation",
    cluster: "quote-to-job",
    buyerProblem: "A scope change reaches one tool or person but not every downstream owner.",
    primaryQuery: "scope change process",
    secondaryQueries: ["scope change workflow", "propagate scope changes"],
    intent: "design-process",
    funnelStage: "solution-aware",
    existingCoverage: ["/real-estate-media"],
    targetPath: "/resources/scope-change-propagation",
    cannibalizationRisk: "low",
    differentiation: "Focuses on downstream execution effects after a customer-approved scope change.",
    evidence: [
      approvedPlanEvidence("Scope-change propagation is in the approved Gate 2 quote-to-job cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "implement-now",
  },
  {
    id: "operational-readiness",
    cluster: "quote-to-job",
    buyerProblem: "The team starts work before people, inputs, authority, and timing are aligned.",
    primaryQuery: "operational readiness checklist",
    secondaryQueries: ["service delivery readiness", "job operational readiness"],
    intent: "run-audit",
    funnelStage: "solution-aware",
    existingCoverage: ["/silent-collapse", "/services/custom-ops-hub"],
    targetPath: "/resources/operational-readiness",
    cannibalizationRisk: "medium",
    differentiation: "A pre-start readiness gate rather than a broad operational-drag diagnostic.",
    evidence: [
      approvedPlanEvidence("Operational readiness is in the approved Gate 2 quote-to-job cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "hold-for-evidence",
  },
  {
    id: "real-estate-media-operating-system",
    cluster: "real-estate-media",
    buyerProblem: "A real estate media company lacks one operating model from booking through delivery.",
    primaryQuery: "real estate media operating system",
    secondaryQueries: ["real estate media workflow software", "real estate photography operations"],
    intent: "evaluate-system",
    funnelStage: "evaluation",
    existingCoverage: ["/real-estate-media"],
    targetPath: "/real-estate-media",
    cannibalizationRisk: "high",
    differentiation: "Expand the existing vertical proof page instead of creating a competing URL.",
    evidence: [
      approvedPlanEvidence("Industry operating system is in the approved Gate 2 real-estate-media cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "hold-for-evidence",
  },
  {
    id: "real-estate-media-scheduling-handoffs",
    cluster: "real-estate-media",
    buyerProblem: "Booking details do not arrive ready for crew assignment and schedule changes.",
    primaryQuery: "real estate photography scheduling workflow",
    secondaryQueries: ["real estate media scheduling", "photography crew scheduling workflow"],
    intent: "design-process",
    funnelStage: "solution-aware",
    existingCoverage: ["/real-estate-media"],
    targetPath: "/resources/real-estate-media-scheduling-handoffs",
    cannibalizationRisk: "medium",
    differentiation: "A scheduling-specific process page that links back to the vertical operating model.",
    evidence: [
      approvedPlanEvidence("Scheduling handoffs are in the approved Gate 2 real-estate-media cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "brief-next",
  },
  {
    id: "real-estate-media-delivery-handoffs",
    cluster: "real-estate-media",
    buyerProblem: "Edited assets reach delivery without a reliable approval, packaging, and release handoff.",
    primaryQuery: "real estate photography delivery workflow",
    secondaryQueries: ["real estate media delivery process", "photo delivery handoff"],
    intent: "design-process",
    funnelStage: "solution-aware",
    existingCoverage: ["/real-estate-media"],
    targetPath: "/resources/real-estate-media-delivery-handoffs",
    cannibalizationRisk: "medium",
    differentiation: "A delivery-specific process page that links back to the vertical operating model.",
    evidence: [
      approvedPlanEvidence("Delivery handoffs are in the approved Gate 2 real-estate-media cluster."),
      pendingFirstPartyEvidence,
    ],
    decision: "brief-next",
  },
] as const satisfies ReadonlyArray<QueryTarget>;

export const GATE_2_IMPLEMENTATION_QUEUE = QUERY_TO_PAGE_REGISTRY.filter(
  ({ decision }) => decision === "implement-now",
);

export const GATE_2_IMPLEMENTED_TARGETS = QUERY_TO_PAGE_REGISTRY.filter(
  ({ decision }) => decision === "implemented",
);

export function validateQueryRegistry(registry: ReadonlyArray<QueryTarget>): ReadonlyArray<string> {
  const errors: Array<string> = [];
  const ids = new Set<string>();
  const targetPaths = new Set<string>();

  for (const target of registry) {
    if (ids.has(target.id)) {
      errors.push(`Duplicate query target id: ${target.id}`);
    }
    ids.add(target.id);

    if (targetPaths.has(target.targetPath) && target.targetPath !== "/real-estate-media") {
      errors.push(`Duplicate query target path: ${target.targetPath}`);
    }
    targetPaths.add(target.targetPath);

    if (target.evidence.length === 0) {
      errors.push(`Missing evidence for query target: ${target.id}`);
    }
  }

  return errors;
}
