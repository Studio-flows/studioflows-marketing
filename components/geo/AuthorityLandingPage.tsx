import { AuthorityArticle } from "@/components/geo/AuthorityArticle";
import { ProcessBlueprintTemplate } from "@/components/geo/ProcessBlueprintTemplate";
import { ScenarioTraceTemplate } from "@/components/geo/ScenarioTraceTemplate";
import type { AuthorityPageDefinition } from "@/lib/geo/authority-pages";

type AuthorityLandingPageProps = {
  page: AuthorityPageDefinition;
};

function assertUnsupportedTemplate(value: never): never {
  const unsupportedTemplate = (value as { template?: unknown }).template;
  throw new Error(`Unsupported authority landing-page template: ${String(unsupportedTemplate)}`);
}

export function AuthorityLandingPage({ page }: AuthorityLandingPageProps) {
  switch (page.template) {
    case "legacy-authority":
      return <AuthorityArticle page={page} />;
    case "process-blueprint":
      return <ProcessBlueprintTemplate page={page} />;
    case "scenario-trace":
      return <ScenarioTraceTemplate page={page} />;
    default:
      return assertUnsupportedTemplate(page);
  }
}
