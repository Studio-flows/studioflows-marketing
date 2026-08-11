import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AUTHORITY_PAGES } from "../lib/geo/authority-pages.ts";

const repositoryRoot = new URL("../", import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, repositoryRoot), "utf8");
}

test("the approved page pair uses distinct intent-driven templates", () => {
  const process = AUTHORITY_PAGES["approved-quote-handoff"];
  const trace = AUTHORITY_PAGES["scope-change-propagation"];

  assert.equal(process.template, "process-blueprint");
  assert.equal(process.artifact.kind, "process-blueprint");
  assert.equal(process.answerPoints.length, 3);
  assert.equal(process.framework.length, 5);
  assert.ok(process.artifact.entryState.length > 0);
  assert.ok(process.artifact.exitState.length > 0);
  assert.ok(process.artifact.releaseRecord.blockers.length > 0);

  assert.equal(trace.template, "scenario-trace");
  assert.equal(trace.artifact.kind, "scenario-trace");
  assert.equal(trace.answerPoints.length, 3);
  assert.equal(trace.framework.length, 5);
  assert.deepEqual(
    trace.artifact.surfaces.map(({ name }) => name),
    [
      "Change record",
      "Work order",
      "Schedule",
      "Resource or crew plan",
      "Customer communication",
      "Billing instruction",
    ],
  );
  for (const surface of trace.artifact.surfaces) {
    assert.ok(surface.before.length > 0);
    assert.ok(surface.after.length > 0);
    assert.ok(surface.owner.length > 0);
    assert.ok(surface.verification.length > 0);
  }
});

test("released measurement pages remain explicit legacy authority pages", async () => {
  const founder = AUTHORITY_PAGES["founder-bottleneck"];
  const ownerAbsence = AUTHORITY_PAGES["business-that-runs-without-you"];

  assert.equal(founder.template, "legacy-authority");
  assert.equal(founder.publishedOn, "2026-08-06");
  assert.equal(founder.modifiedOn, "2026-08-06");
  assert.equal(ownerAbsence.template, "legacy-authority");
  assert.equal(ownerAbsence.publishedOn, "2026-08-06");
  assert.equal(ownerAbsence.modifiedOn, "2026-08-06");

  for (const path of [
    "app/resources/founder-bottleneck/page.tsx",
    "app/resources/business-that-runs-without-you/page.tsx",
  ]) {
    const route = await source(path);
    assert.match(route, /import \{ AuthorityArticle \}/);
    assert.match(route, /return <AuthorityArticle page=\{page\} \/>/);
    assert.doesNotMatch(route, /AuthorityLandingPage/);
  }
});

test("the landing-page dispatcher is exhaustive and has no fallback renderer", async () => {
  const dispatcher = await source("components/geo/AuthorityLandingPage.tsx");

  assert.match(dispatcher, /case "legacy-authority":/);
  assert.match(dispatcher, /case "process-blueprint":/);
  assert.match(dispatcher, /case "scenario-trace":/);
  assert.match(dispatcher, /assertUnsupportedTemplate\(page\)/);
  assert.doesNotMatch(dispatcher, /default:[\s\S]*<AuthorityArticle/);
});

test("the shared GEO spine preserves anchors and three tracked action positions", async () => {
  const shared = await source("components/geo/AuthorityLandingShared.tsx");
  const trackedLink = await source("components/analytics/TrackedResourceLink.tsx");

  for (const id of ["answer", "artifact", "example", "evidence", "action"]) {
    const combinedTemplates = [
      shared,
      await source("components/geo/ProcessBlueprintTemplate.tsx"),
      await source("components/geo/ScenarioTraceTemplate.tsx"),
    ].join("\n");
    assert.match(combinedTemplates, new RegExp(`id=\\"${id}\\"`));
  }

  for (const position of ["hero", "midpoint", "final"]) {
    assert.match(
      shared,
      new RegExp(`eventLocation=\\{\\\`authority_\\$\\{page\\.slug\\}_${position}\\\`\\}`),
    );
  }
  assert.equal(shared.match(/<TrackedResourceLink/g)?.length, 3);
  assert.doesNotMatch(shared, /^"use client";/);
  assert.match(trackedLink, /event: "resource_cta_click"/);
  assert.match(trackedLink, /resource_location: eventLocation/);
});

test("modern routes use the shared dispatcher with canonical metadata", async () => {
  for (const path of [
    "app/resources/approved-quote-handoff/page.tsx",
    "app/resources/scope-change-propagation/page.tsx",
  ]) {
    const route = await source(path);
    assert.match(route, /import \{ AuthorityLandingPage \}/);
    assert.match(route, /alternates: \{\s*canonical: page\.path,/);
    assert.match(route, /return <AuthorityLandingPage page=\{page\} \/>/);
  }
});
