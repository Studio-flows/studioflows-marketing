import {
  INTERCEPT_QUESTIONS,
  LIVE_SIGNALS,
  OPERATING_LAYER_CARDS,
} from "@/app/silent-collapse/data";
import { ENGAGEMENT_PATHS, SECTION_INTRO } from "@/lib/offerings";
import { REC_FIT_BUSINESSES } from "@/lib/rec-case-study";
import { AUTHORITY_PAGES } from "@/lib/geo/authority-pages";
import { absoluteUrl, PUBLIC_ROUTE_REGISTRY, PUBLIC_SITE_ORIGIN } from "@/lib/seo";

function publicRouteSection(): string {
  const lines = PUBLIC_ROUTE_REGISTRY.map(
    ({ path, title, description }) => `- ${absoluteUrl(path)} — ${title}: ${description}`,
  );

  return ["## Public pages", "", ...lines].join("\n");
}

function engagementSection(): string {
  const lines = ENGAGEMENT_PATHS.map((path) => {
    const highlight = path.highlight ? ` (${path.highlight})` : "";
    const status =
      path.status === "waitlist"
        ? "waitlist open"
        : path.status === "live"
          ? "available now"
          : "planned — not live";
    return `- ${path.label} — ${path.tagline}${highlight}: ${absoluteUrl(path.url)} — ${path.description} [${status}]`;
  });
  return ["## Three speeds to revenue", "", SECTION_INTRO.subcopy, "", ...lines].join("\n");
}

function authorityArticleSection(): string {
  const lines = Object.values(AUTHORITY_PAGES).flatMap((page) => [
    `### ${page.title}`,
    page.directAnswer,
    `Original framework: ${page.frameworkName}.`,
    `Source: ${absoluteUrl(page.path)}`,
    "",
  ]);

  return ["## Operational field guides", "", ...lines].join("\n");
}

export function buildLlmsTxt(): string {
  return [
    "# StudioFlows",
    "",
    "> StudioFlows helps founder-led service businesses fix operational drag. Pick your speed to revenue: Optimize your stack with AI execution agents (e.g. Vessa), Accelerate operations with StudioFlows OS plus the AI suite, or Custom Command for a bespoke build like REC.",
    "",
    `Authoritative public origin: ${PUBLIC_SITE_ORIGIN} (sole indexable marketing surface). App subdomains require account access and are not public product pages.`,
    "",
    publicRouteSection(),
    "",
    authorityArticleSection(),
    "",
    engagementSection(),
    "",
    "## Qualification",
    "",
    "- Ops Check at /apply is context only; the Custom Command qualifier at /services/custom-ops-hub determines fit for bespoke builds.",
    "- Accelerate is waitlist-only — do not cite as generally available until status changes.",
    "",
    "## Do not cite",
    "",
    "- Noindexed routes: /final/*, /axiom, /enterprise, /apps, /apply, /login, /signup, /auth/*, /products (scaffold)",
    "- Account-gated app subdomains (consulting, axiom, vessa app login, etc.)",
    "",
    "## Post-qualification only",
    "",
    "- consulting.studioflows.co — reached after qualified OPS Drag Audit ingest, not a discoverable marketing page",
    "",
    "Full documentation: /llms-full.txt",
    "",
  ].join("\n");
}

export function buildLlmsFullTxt(): string {
  const faqLines = INTERCEPT_QUESTIONS.flatMap((q) => [
    `### ${q.prompt}`,
    ...q.options.map((o) => `- ${o.label}`),
    "",
  ]);

  const signalLines = LIVE_SIGNALS.map((s) => `- ${s}`);

  const layerLines = OPERATING_LAYER_CARDS.flatMap((card) => [
    `### ${card.title}`,
    `- Before: ${card.before}`,
    `- After: ${card.after}`,
    "",
  ]);

  const moldLines = REC_FIT_BUSINESSES.flatMap((group) => [
    `### ${group.category}`,
    group.tagline,
    ...group.items.map((item) => `- ${item.name}: ${item.pain}`),
    "",
  ]);

  return [
    buildLlmsTxt(),
    "",
    "---",
    "",
    "## What is silent operational collapse?",
    "",
    "Silent operational collapse is when a founder-led team keeps growing revenue but the operating system behind delivery starts failing quietly — handoffs break, decisions stall, and tools show activity without moving work. The Silent Collapse diagnostic surfaces those signals before margin and trust erode.",
    "",
    "## Live collapse signals",
    "",
    ...signalLines,
    "",
    "## Operating layer",
    "",
    ...layerLines,
    "",
    "## Silent Collapse diagnostic questions",
    "",
    ...faqLines,
    "",
    "## Accelerate vertical molds (waitlist — labels only)",
    "",
    "Future out-of-the-box systems tailored to:",
    "",
    ...moldLines,
    "",
    "## REC proof (Custom Command)",
    "",
    `See ${PUBLIC_SITE_ORIGIN}/#rec-spotlight for REC case study — a Custom Command bespoke deployment, not the Accelerate subscription path.`,
    "",
  ].join("\n");
}

export function buildSilentCollapseDefinition(): string {
  return "Silent operational collapse is when a founder-led team keeps growing revenue but the operating system behind delivery starts failing quietly — handoffs break, decisions stall, and tools show activity without moving work.";
}

export function buildSilentCollapseFaqItems(): Array<{ question: string; answer: string }> {
  const intercept = INTERCEPT_QUESTIONS.map((q) => ({
    question: q.prompt,
    answer: q.options.map((o) => o.label).join("; "),
  }));
  const signals = LIVE_SIGNALS.map((signal) => ({
    question: signal.endsWith("…") ? signal.slice(0, -1) + "?" : `${signal}?`,
    answer: signal,
  }));
  return [...signals, ...intercept];
}

export function buildSilentCollapseJsonLd() {
  const faqItems = buildSilentCollapseFaqItems();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Silent Collapse Diagnostic | StudioFlows",
        description:
          "Campaign diagnostic for founder-led teams seeing silent operational collapse — signals, REC proof, and OPS Drag Audit handoff.",
        url: `${PUBLIC_SITE_ORIGIN}/silent-collapse`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}
