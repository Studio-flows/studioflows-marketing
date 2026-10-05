import { AUTHORITY_PAGES } from "./authority-pages.ts";
import { GATE_2_MEASUREMENT_CRITERIA } from "./measurement-registry.ts";
import {
  GATE_2_IMPLEMENTATION_QUEUE,
  QUERY_TO_PAGE_REGISTRY,
} from "./query-registry.ts";
import { PUBLIC_ROUTE_REGISTRY } from "../seo.ts";

export type GeoAuthorityExport = {
  schemaVersion: "1.0.0";
  repository: "Studio-flows/studioflows-marketing";
  commitSha: string;
  queryTargets: typeof QUERY_TO_PAGE_REGISTRY;
  implementationTargetIds: ReadonlyArray<string>;
  measurementCriteria: typeof GATE_2_MEASUREMENT_CRITERIA;
  publicRoutes: typeof PUBLIC_ROUTE_REGISTRY;
  releasedAuthorityPages: ReadonlyArray<{
    slug: string;
    path: string;
    cluster: string;
    template: string;
    publishedOn: string;
    modifiedOn: string;
    primaryQuery: string;
  }>;
};

export function buildGeoAuthorityExport(commitSha: string): GeoAuthorityExport {
  if (!/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error("GEO_AUTHORITY_COMMIT_SHA_INVALID");
  }

  return {
    schemaVersion: "1.0.0",
    repository: "Studio-flows/studioflows-marketing",
    commitSha,
    queryTargets: QUERY_TO_PAGE_REGISTRY,
    implementationTargetIds: GATE_2_IMPLEMENTATION_QUEUE.map(({ id }) => id),
    measurementCriteria: GATE_2_MEASUREMENT_CRITERIA,
    publicRoutes: PUBLIC_ROUTE_REGISTRY,
    releasedAuthorityPages: Object.values(AUTHORITY_PAGES).map((page) => ({
      slug: page.slug,
      path: page.path,
      cluster: page.cluster,
      template: page.template,
      publishedOn: page.publishedOn,
      modifiedOn: page.modifiedOn,
      primaryQuery: page.primaryQuery,
    })),
  };
}
