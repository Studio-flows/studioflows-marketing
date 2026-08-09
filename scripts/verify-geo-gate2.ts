import { AUTHORITY_PAGES } from "../lib/geo/authority-pages.ts";
import type { AuthorityPageDefinition } from "../lib/geo/authority-pages.ts";
import {
  GATE_2_IMPLEMENTED_TARGETS,
  GATE_2_IMPLEMENTATION_QUEUE,
  QUERY_TO_PAGE_REGISTRY,
  validateQueryRegistry,
} from "../lib/geo/query-registry.ts";
import { GATE_2_MEASUREMENT_CRITERIA } from "../lib/geo/measurement-registry.ts";
import { PUBLIC_ROUTE_REGISTRY } from "../lib/seo.ts";

const errors: Array<string> = [...validateQueryRegistry(QUERY_TO_PAGE_REGISTRY)];
const publicPaths = new Set<string>(PUBLIC_ROUTE_REGISTRY.map(({ path }) => path));
const authorityPaths = new Set<string>(Object.values(AUTHORITY_PAGES).map(({ path }) => path));
const templateCounts: Record<AuthorityPageDefinition["template"], number> = {
  "legacy-authority": 0,
  "process-blueprint": 0,
  "scenario-trace": 0,
};

if (QUERY_TO_PAGE_REGISTRY.length !== 12) {
  errors.push(`Expected 12 query targets, received ${QUERY_TO_PAGE_REGISTRY.length}.`);
}

if (GATE_2_IMPLEMENTATION_QUEUE.length !== 2) {
  errors.push(`Expected 2 implementation targets, received ${GATE_2_IMPLEMENTATION_QUEUE.length}.`);
}

if (GATE_2_IMPLEMENTED_TARGETS.length !== 2) {
  errors.push(`Expected 2 implemented targets, received ${GATE_2_IMPLEMENTED_TARGETS.length}.`);
}

for (const target of [...GATE_2_IMPLEMENTED_TARGETS, ...GATE_2_IMPLEMENTATION_QUEUE]) {
  if (!publicPaths.has(target.targetPath)) {
    errors.push(`Implementation target is missing from the public route registry: ${target.targetPath}`);
  }
  if (!authorityPaths.has(target.targetPath)) {
    errors.push(`Implementation target is missing an authority page definition: ${target.targetPath}`);
  }
}

for (const authorityPage of Object.values(AUTHORITY_PAGES)) {
  const page: AuthorityPageDefinition = authorityPage;
  templateCounts[page.template] += 1;
  if (page.framework.length < 4) {
    errors.push(`Authority page requires at least four framework steps: ${page.path}`);
  }
  if (page.sources.length < 3) {
    errors.push(`Authority page requires at least three evidence sources: ${page.path}`);
  }
  if (page.limitations.length === 0) {
    errors.push(`Authority page requires explicit limitations: ${page.path}`);
  }
  if (page.relatedLinks.length < 2) {
    errors.push(`Authority page requires contextual internal links: ${page.path}`);
  }
  if (!page.action.href.startsWith("/")) {
    errors.push(`Authority page action must use an internal path: ${page.path}`);
  }

  if (page.template !== "legacy-authority") {
    const artifactKind: string = page.artifact.kind;
    const templateName: string = page.template;
    if (artifactKind !== templateName) {
      errors.push(`Authority page artifact mismatch: ${page.path}`);
    }
  }

  switch (page.template) {
    case "legacy-authority":
      break;
    case "process-blueprint":
      if (page.answerPoints.length !== 3) {
        errors.push(`Process blueprint requires three answer points: ${page.path}`);
      }
      if (page.artifact.releaseRecord.blockers.length === 0) {
        errors.push(`Process blueprint requires at least one readiness blocker: ${page.path}`);
      }
      break;
    case "scenario-trace":
      if (page.answerPoints.length !== 3) {
        errors.push(`Scenario trace requires three answer points: ${page.path}`);
      }
      if (page.artifact.surfaces.length < 6) {
        errors.push(`Scenario trace requires six affected surfaces: ${page.path}`);
      }
      break;
  }
}

if (templateCounts["legacy-authority"] !== 2) {
  errors.push(`Expected 2 legacy authority templates, received ${templateCounts["legacy-authority"]}.`);
}

if (templateCounts["process-blueprint"] !== 1) {
  errors.push(`Expected 1 process blueprint template, received ${templateCounts["process-blueprint"]}.`);
}

if (templateCounts["scenario-trace"] !== 1) {
  errors.push(`Expected 1 scenario trace template, received ${templateCounts["scenario-trace"]}.`);
}

if (GATE_2_MEASUREMENT_CRITERIA.length < 5) {
  errors.push("Gate 2 requires measurement criteria across search, behavior, and conversion evidence.");
}

if (errors.length > 0) {
  throw new Error(`GEO Gate 2 verification failed:\n${errors.join("\n")}`);
}

process.stdout.write(
  `GEO Gate 2 registry verified: ${QUERY_TO_PAGE_REGISTRY.length} query targets, ${GATE_2_IMPLEMENTED_TARGETS.length} implemented targets, ${GATE_2_IMPLEMENTATION_QUEUE.length} implementation targets, ${PUBLIC_ROUTE_REGISTRY.length} public routes, ${GATE_2_MEASUREMENT_CRITERIA.length} measurement criteria.\n`,
);
