export type MeasurementSource = "Google Search Console" | "GA4" | "Bing Webmaster" | "Clarity";

export type Gate2MeasurementCriterion = {
  id: string;
  source: MeasurementSource;
  earliestDecisionDay: number;
  metric: string;
  passCondition: string;
  failAction: string;
};

export const GATE_2_MEASUREMENT_CRITERIA = [
  {
    id: "google-index-eligibility",
    source: "Google Search Console",
    earliestDecisionDay: 2,
    metric: "URL inspection state for each released page",
    passCondition: "URL is eligible for indexing with the submitted canonical.",
    failAction: "Repair the reported crawl, canonical, or index directive before publishing another page.",
  },
  {
    id: "bing-index-eligibility",
    source: "Bing Webmaster",
    earliestDecisionDay: 2,
    metric: "URL inspection state for each released page",
    passCondition: "URL is discoverable and has no blocking SEO issue.",
    failAction: "Repair the reported issue and resubmit only the affected URL.",
  },
  {
    id: "non-branded-query-entry",
    source: "Google Search Console",
    earliestDecisionDay: 14,
    metric: "Non-branded impressions and query rows by released page",
    passCondition: "At least one relevant non-branded query produces impressions for each page.",
    failAction: "Inspect indexing, query intent, title, opening answer, and internal anchors before expanding the cluster.",
  },
  {
    id: "organic-engagement",
    source: "GA4",
    earliestDecisionDay: 14,
    metric: "Organic sessions and resource_cta_click events by landing page",
    passCondition: "Organic visits are attributable and the CTA event can be segmented to each released page.",
    failAction: "Repair attribution or event coverage before using conversion behavior to judge content quality.",
  },
  {
    id: "reader-depth",
    source: "Clarity",
    earliestDecisionDay: 14,
    metric: "Scroll depth, active time, dead clicks, and resource CTA sessions by page",
    passCondition: "Each page has observable human sessions with no repeated dead-click pattern on the primary action.",
    failAction: "Repair the confusing section or action before changing the query target.",
  },
  {
    id: "ai-citation-entry",
    source: "Bing Webmaster",
    earliestDecisionDay: 30,
    metric: "AI Performance citations and cited pages",
    passCondition: "Citation reporting remains observable; a citation is a positive signal, not a release requirement.",
    failAction: "Keep the page live if search and reader evidence are sound; strengthen sourcing and direct answers before expansion.",
  },
] as const satisfies ReadonlyArray<Gate2MeasurementCriterion>;
