import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { createMarketingSupabaseServerClient } from "../lib/supabase-server.js";

const migrationName = "20260822090000_ops_drag_least_privilege.sql";
const rollbackName = "20260822090000_ops_drag_least_privilege.rollback.sql";
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

const migrationNames = readdirSync("supabase/migrations").sort();
const migrationVersion = migrationName.split("_")[0];
assert.ok(migrationVersion > "20260819080556");
assert.ok(migrationName < "20260822104931_ops_drag_retention_runtime.sql");
assert.ok(migrationName < "20260822_add_ops_drag_worker_cursor.sql");
assert.ok(migrationNames.indexOf(migrationName) < migrationNames.indexOf("20260822104931_ops_drag_retention_runtime.sql"));
assert.ok(migrationNames.indexOf(migrationName) < migrationNames.indexOf("20260822_add_ops_drag_worker_cursor.sql"));

for (const contract of [
  /set local lock_timeout = '5s'/,
  /set local statement_timeout = '30s'/,
  /84bee0ca31f59de421bc59cf960473b388d32961000c7cff8988d4ed63d101eb/,
  /drop policy "Allow custom ops hub lead inserts"/,
  /revoke all privileges on table public\.custom_ops_hub_leads from public, anon, authenticated/,
  /alter table public\.custom_ops_hub_leads enable row level security/,
  /alter function public\.set_custom_ops_hub_leads_updated_at\(\) set search_path = pg_catalog/,
  /OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION/,
  /OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK/,
]) assert.match(migration, contract);
assert.doesNotMatch(migration, /db push|disable row level security/i);

for (const contract of [
  /OPS_DRAG_LEAST_PRIVILEGE_ROLLBACK_PRECONDITION/,
  /alter function public\.set_custom_ops_hub_leads_updated_at\(\) reset search_path/,
  /grant select, insert, update, delete, truncate, references, trigger/,
  /create policy "Allow custom ops hub lead inserts"/,
  /OPS_DRAG_LEAST_PRIVILEGE_ROLLBACK_POSTCHECK/,
]) assert.match(rollback, contract);
assert.doesNotMatch(rollback, /db push|disable row level security/i);

console.log(
  "OPS_DRAG_REPORT_SUPABASE_SECURITY_PASS service_role_only=PASS migration_order=PASS preconditions=BOUND rollback=REVIEWED blind_db_push=ABSENT",
);
