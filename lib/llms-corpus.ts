import {
  INTERCEPT_QUESTIONS,
  LIVE_SIGNALS,
  OPERATING_LAYER_CARDS,
} from "@/app/silent-collapse/data";
import { ARCHETYPES } from "@/components/home/archetype-content";
import { AUTHORITY_PAGES } from "@/lib/geo/authority-pages";
import { absoluteUrl, PUBLIC_ROUTE_REGISTRY, PUBLIC_SITE_ORIGIN, SITE_POSITIONING } from "@/lib/seo";

function publicRouteSection(): string {
  const lines = PUBLIC_ROUTE_REGISTRY.map(
    ({ path, title, description }) => `- ${absoluteUrl(path)} — ${title}: ${description}`,
  );

  return ["## Public pages", "", ...lines].join("\n");
}

function businessFlowsSection(): string {
  const lines = ARCHETYPES.map((flow) =>
    `- ${flow.name} (${flow.label}): ${flow.description} Examples: ${flow.examples.map((example) => example.name).join(", ")}.`,
  );
  return [
    "## Who StudioFlows is for",
    "",
    "Service businesses across industries, organized by how their work moves. Creative studios and real estate media are examples within that audience, not its limits.",
    "",
    ...lines,
    "",
    "These are illustrative business flows and configuration examples from the public homepage, not a list of released industry packs or verified runtime capabilities.",
  ].join("\n");
}

function authorityArticleSection(): string {
  const lines = Object.values(AUTHORITY_PAGES).flatMap((page) => [
    `### ${page.title}`,
    page.directAnswer,
    `Original framework: ${page.frameworkName}.`,
    `Source: ${absoluteUrl(page.path)}`,
    "",
  ]);

  return ["## Owner-dependency field guides", "", ...lines].join("\n");
}

export function buildLlmsTxt(): string {
  return [
    "# StudioFlows",
    "",
    `> ${SITE_POSITIONING.description}`,
    "",
    `Authoritative public origin: ${PUBLIC_SITE_ORIGIN} (sole indexable marketing surface). App subdomains require account access and are not public product pages.`,
    "",
    publicRouteSection(),
    "",
    authorityArticleSection(),
    "",
    businessFlowsSection(),
    "",
    "## Getting started and availability",
    "",
    `- Find your business flow and see the operating-system walkthrough at ${absoluteUrl("/")}.`,
    "- The current demo at https://os.studioflows.co/demo/access requires sign-in and shows an existing demo workspace; it does not create a configured business for the visitor.",
    `- Accelerate at ${absoluteUrl("/platform")} is waitlist-only; do not describe it as generally available.`,
    `- The Ops Teardown at ${absoluteUrl("/services/custom-ops-hub")} is a guided operational audit for service businesses.`,
    `- Real estate media at ${absoluteUrl("/real-estate-media")} is one industry operating-model example within the wider service-business audience.`,
    "",
    "## Do not cite",
    "",
    "- Noindexed routes: /final/*, /axiom, /enterprise, /apps, /apply, /login, /signup, /auth/*, /products (scaffold)",
    "- Account-gated app subdomains (consulting, axiom, vessa app login, etc.)",
    "",
    `Full public reference: ${absoluteUrl("/llms-full.txt")}`,
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

  const flowLines = ARCHETYPES.flatMap((flow) => [
    `### ${flow.name}: ${flow.label}`,
    flow.description,
    `Unit of work: ${flow.unit}.`,
    `Example flow: ${flow.flow.join(" → ")}.`,
    ...flow.examples.map((example) => `- ${example.name}: ${example.pack} Business configuration: ${example.configuration}`),
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
    "## Business flows and industry examples",
    "",
    "The homepage illustrates six ways service businesses organize work. The examples below describe possible industry packs and business configuration, not generally available features or completed customer deployments.",
    "",
    ...flowLines,
    "",
    "## Industry-specific operating model",
    "",
    `See ${absoluteUrl("/real-estate-media")} for the real estate media operating model. It is one service-business example, not the definition of StudioFlows or proof that every illustrated industry pack has shipped.`,
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
          "A diagnostic for service-business owners to find founder bottlenecks, stalled decisions, and broken handoffs, with an Ops Drag Audit path.",
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
