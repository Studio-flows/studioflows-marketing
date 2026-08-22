import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { createMarketingSupabaseServerClient } from "../lib/supabase-server.js";

const migrationName = "20260822090000_ops_drag_least_privilege.sql";
const rollbackName = "20260822090000_ops_drag_least_privilege.rollback.sql";
const workerMigrationName = "20260822100000_add_ops_drag_worker_cursor.sql";
const retentionMigrationName = "20260822104931_ops_drag_retention_runtime.sql";
const migration = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
const rollback = readFileSync(`supabase/rollbacks/${rollbackName}`, "utf8");

let createCalls = 0;
const fakeClient = { kind: "service-role-client" };
const createSupabaseClient = ((url: string, key: string, options: unknown) => {
  createCalls += 1;
  assert.equal(url, "https://fixture.supabase.co");
  assert.equal(key, "service-role-fixture");
  assert.deepEqual(options, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return fakeClient;
}) as unknown as typeof import("@supabase/supabase-js").createClient;

assert.equal(createMarketingSupabaseServerClient({
  environment: {
    ...process.env,
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_ANON_KEY: "anon-must-not-be-used",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-must-not-be-used",
  },
  createSupabaseClient,
}), null);
assert.equal(createCalls, 0, "anon-only configuration must fail before client construction");

assert.equal(createMarketingSupabaseServerClient({
  environment: {
    ...process.env,
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-fixture",
  },
  createSupabaseClient,
}), fakeClient);
assert.equal(createCalls, 1);

assert.equal(createMarketingSupabaseServerClient({
  environment: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-fixture",
  },
  createSupabaseClient,
}), fakeClient);
assert.equal(createCalls, 2, "the non-secret URL fallback remains supported");

assert.equal(createMarketingSupabaseServerClient({
  environment: {
    ...process.env,
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "   ",
  },
  createSupabaseClient,
}), null);
assert.equal(createCalls, 2, "blank service-role configuration must fail closed");

const migrationNames = readdirSync("supabase/migrations");
const migrationVersion = migrationName.split("_")[0];
assert.ok(migrationVersion > "20260819080556");
const liveLatestVersion = "20260819080556";
const liveLatestDate = liveLatestVersion.slice(0, 8);
const pendingMigrations = migrationNames.flatMap((name) => {
  const match = /^(\d+)_/.exec(name);
  assert.ok(match, `migration ${name} must begin with a numeric version`);
  const rawVersion = match[1];
  if (rawVersion.length < 14 && rawVersion >= liveLatestDate) {
    assert.fail(`pending migration ${name} must use a unique 14-digit version`);
  }
  if (rawVersion.length === 14 && rawVersion > liveLatestVersion) return [{ name, version: rawVersion }];
  return [];
});
assert.equal(new Set(pendingMigrations.map(({ version }) => version)).size, pendingMigrations.length);
const orderedPending = pendingMigrations.sort((left, right) => left.version.localeCompare(right.version));
assert.deepEqual(orderedPending.map(({ name }) => name), [
  migrationName,
  workerMigrationName,
  retentionMigrationName,
]);
assert.equal(migrationNames.includes("20260822_add_ops_drag_worker_cursor.sql"), false);

for (const contract of [
  /set local lock_timeout = '5s'/,
  /set local statement_timeout = '30s'/,
  /84bee0ca31f59de421bc59cf960473b388d32961000c7cff8988d4ed63d101eb/,
  /drop policy "Allow custom ops hub lead inserts"/,
  /revoke all privileges on table public\.custom_ops_hub_leads from public, anon, authenticated/,
  /grant select, insert, update on table public\.custom_ops_hub_leads to service_role/,
  /revoke execute on function public\.set_custom_ops_hub_leads_updated_at\(\)[\s\S]*from public, anon, authenticated, service_role/,
  /p\.proowner = 'postgres'::regrole/,
  /p\.proacl is null/,
  /alter table public\.custom_ops_hub_leads enable row level security/,
  /alter function public\.set_custom_ops_hub_leads_updated_at\(\) set search_path = pg_catalog/,
  /OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION/,
  /OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK/,
]) assert.match(migration, contract);
assert.doesNotMatch(migration, /db push|disable row level security/i);

for (const contract of [
  /OPS_DRAG_LEAST_PRIVILEGE_ROLLBACK_PRECONDITION/,
  /drop function public\.set_custom_ops_hub_leads_updated_at\(\)/,
  /create function public\.set_custom_ops_hub_leads_updated_at\(\)/,
  /alter function public\.set_custom_ops_hub_leads_updated_at\(\) owner to postgres/,
  /grant select, insert, update, delete, truncate, references, trigger/,
  /create policy "Allow custom ops hub lead inserts"/,
  /OPS_DRAG_LEAST_PRIVILEGE_ROLLBACK_POSTCHECK/,
]) assert.match(rollback, contract);
assert.doesNotMatch(rollback, /db push|disable row level security/i);

const accessSources = {
  select: [
    readFileSync("lib/ops-teardown/load-teardown-sheet.js", "utf8"),
    readFileSync("lib/ops-drag-report/order-store.ts", "utf8"),
  ].join("\n"),
  insertUpdate: [
    readFileSync("app/api/studioflows/ingest-lead/route.ts", "utf8"),
    readFileSync("lib/ops-drag-report/order-store.ts", "utf8"),
  ].join("\n"),
  ownerDelete: readFileSync(retentionMigrationName.startsWith("2026")
    ? `supabase/migrations/${retentionMigrationName}`
    : retentionMigrationName, "utf8"),
};
assert.match(accessSources.select, /\.select\(/);
assert.match(accessSources.insertUpdate, /\.insert\(|\.update\(/);
assert.match(accessSources.ownerDelete, /security definer[\s\S]*delete from public\.custom_ops_hub_leads/i);
assert.doesNotMatch(migration, /grant[^;]*(?:delete|truncate|references|trigger)[^;]*to service_role/i);

console.log(
  "OPS_DRAG_REPORT_SUPABASE_SECURITY_PASS service_role_only=PASS migration_versions=14_DIGIT access_map=SELECT_INSERT_UPDATE owner_delete=SECURITY_DEFINER function_acl=OWNER_ONLY rollback=EXACT blind_db_push=ABSENT",
);
