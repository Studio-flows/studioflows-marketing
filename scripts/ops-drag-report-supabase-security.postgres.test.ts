import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const psqlPath = process.env.OPS_DRAG_PSQL_PATH;
const databaseUrl = process.env.OPS_DRAG_TEST_DATABASE_URL;
assert.ok(psqlPath, "OPS_DRAG_PSQL_PATH is required");
assert.ok(databaseUrl, "OPS_DRAG_TEST_DATABASE_URL is required");

const parsedUrl = new URL(databaseUrl);
assert.ok(
  parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost",
  "isolated PostgreSQL proof must target localhost",
);

function psql(sql: string, expectFailure = false): string {
  try {
    const output = execFileSync(psqlPath!, [
      "-X", "-v", "ON_ERROR_STOP=1", "-Atq", "-d", databaseUrl!,
    ], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    assert.equal(expectFailure, false, "statement unexpectedly succeeded");
    return output.trim();
  } catch (error) {
    assert.equal(expectFailure, true, "statement unexpectedly failed");
    const failure = error as { stderr?: string };
    return String(failure.stderr ?? "");
  }
}

const fixture = `
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create extension pgcrypto;
create table public.custom_ops_hub_leads (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
create or replace function public.set_custom_ops_hub_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger trg_set_custom_ops_hub_leads_updated_at
before update on public.custom_ops_hub_leads
for each row execute procedure public.set_custom_ops_hub_leads_updated_at();
alter table public.custom_ops_hub_leads enable row level security;
create policy "Allow custom ops hub lead inserts"
on public.custom_ops_hub_leads for insert to anon, authenticated with check (true);
grant select, insert, update, delete, truncate, references, trigger
on public.custom_ops_hub_leads to anon, authenticated, service_role;
`;
psql(fixture);

const functionHash = psql(`
select encode(digest(convert_to(
  pg_get_functiondef('public.set_custom_ops_hub_leads_updated_at()'::regprocedure),
  'UTF8'
), 'sha256'), 'hex');
`);
assert.equal(functionHash, "84bee0ca31f59de421bc59cf960473b388d32961000c7cff8988d4ed63d101eb");

const migration = readFileSync("supabase/migrations/20260822090000_ops_drag_least_privilege.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/20260822090000_ops_drag_least_privilege.rollback.sql", "utf8");
psql(migration);

const postApply = JSON.parse(psql(`
with target as (
  select c.oid, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c where c.oid = 'public.custom_ops_hub_leads'::regclass
), service_privileges as (
  select array_agg(acl.privilege_type order by acl.privilege_type) privileges
  from pg_class c
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
  join pg_roles r on r.oid = acl.grantee
  where c.oid = 'public.custom_ops_hub_leads'::regclass
    and r.rolname = 'service_role' and not acl.is_grantable
)
select json_build_object(
  'rls', (select relrowsecurity and not relforcerowsecurity from target),
  'table_owner', (select pg_get_userbyid(relowner) from pg_class where oid='public.custom_ops_hub_leads'::regclass),
  'function_owner', (select pg_get_userbyid(proowner) from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure),
  'policies', (select count(*) from pg_policy where polrelid = 'public.custom_ops_hub_leads'::regclass),
  'client_acl', (select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='custom_ops_hub_leads' and grantee in ('anon','authenticated')),
  'service_privileges', (select privileges from service_privileges),
  'function_client_execute', (select count(*) from unnest(array['anon','authenticated','service_role']) r where has_function_privilege(r, 'public.set_custom_ops_hub_leads_updated_at()'::regprocedure, 'EXECUTE')),
  'function_nonowner_acl', (select count(*) from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl where p.oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure and acl.grantee <> p.proowner),
  'proconfig', (select proconfig from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure),
  'trigger_count', (select count(*) from pg_trigger where tgrelid='public.custom_ops_hub_leads'::regclass and not tgisinternal)
);
`));
assert.deepEqual(postApply, {
  rls: true,
  table_owner: "postgres",
  function_owner: "postgres",
  policies: 0,
  client_acl: 0,
  service_privileges: ["INSERT", "SELECT", "UPDATE"],
  function_client_execute: 0,
  function_nonowner_acl: 0,
  proconfig: ["search_path=pg_catalog"],
  trigger_count: 1,
});

const triggerProof = psql(`
set role service_role;
insert into public.custom_ops_hub_leads(id, updated_at)
values ('00000000-0000-4000-8000-000000000002', '2000-01-01T00:00:00Z');
select count(*) from public.custom_ops_hub_leads where id='00000000-0000-4000-8000-000000000002';
update public.custom_ops_hub_leads set updated_at='2000-01-01T00:00:00Z'
where id='00000000-0000-4000-8000-000000000002';
select case when updated_at > '2000-01-01T00:00:00Z'::timestamptz then 'TRIGGER_PASS' else 'TRIGGER_FAIL' end
from public.custom_ops_hub_leads where id='00000000-0000-4000-8000-000000000002';
`);
assert.deepEqual(triggerProof.split(/\r?\n/), ["1", "TRIGGER_PASS"]);
assert.equal(psql(`select has_table_privilege('service_role','public.custom_ops_hub_leads','DELETE') or has_table_privilege('service_role','public.custom_ops_hub_leads','TRUNCATE') or has_table_privilege('service_role','public.custom_ops_hub_leads','REFERENCES') or has_table_privilege('service_role','public.custom_ops_hub_leads','TRIGGER');`), "f");
psql(`reset role; delete from public.custom_ops_hub_leads where id='00000000-0000-4000-8000-000000000002';`);

psql(rollback);
const postRollback = JSON.parse(psql(`
select json_build_object(
  'rls', (select relrowsecurity and not relforcerowsecurity from pg_class where oid='public.custom_ops_hub_leads'::regclass),
  'policy_count', (select count(*) from pg_policy where polrelid='public.custom_ops_hub_leads'::regclass and polname='Allow custom ops hub lead inserts'),
  'anon_privileges', (select array_agg(privilege_type order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='custom_ops_hub_leads' and grantee='anon'),
  'authenticated_privileges', (select array_agg(privilege_type order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='custom_ops_hub_leads' and grantee='authenticated'),
  'service_privileges', (select array_agg(privilege_type order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='custom_ops_hub_leads' and grantee='service_role'),
  'proconfig', (select proconfig from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure),
  'proacl_is_null', (select proacl is null from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure),
  'default_execute_count', (select count(*) from unnest(array['anon','authenticated','service_role']) r where has_function_privilege(r, 'public.set_custom_ops_hub_leads_updated_at()'::regprocedure, 'EXECUTE')),
  'function_hash', encode(digest(convert_to(pg_get_functiondef('public.set_custom_ops_hub_leads_updated_at()'::regprocedure),'UTF8'),'sha256'),'hex')
);
`));
assert.deepEqual(postRollback, {
  rls: true,
  policy_count: 1,
  anon_privileges: ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"],
  authenticated_privileges: ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"],
  service_privileges: ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"],
  proconfig: null,
  proacl_is_null: true,
  default_execute_count: 3,
  function_hash: "84bee0ca31f59de421bc59cf960473b388d32961000c7cff8988d4ed63d101eb",
});

psql(`
drop policy "Allow custom ops hub lead inserts" on public.custom_ops_hub_leads;
create policy "Allow custom ops hub lead inserts"
on public.custom_ops_hub_leads for insert to anon with check (true);
`);
const driftFailure = psql(migration, true);
assert.match(driftFailure, /OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: policy state drifted/);
const driftPreserved = JSON.parse(psql(`
select json_build_object(
  'policy_count', (select count(*) from pg_policy where polrelid='public.custom_ops_hub_leads'::regclass),
  'roles', (select array_agg(r.rolname order by r.rolname) from pg_policy p cross join lateral unnest(p.polroles) role_oid join pg_roles r on r.oid=role_oid where p.polrelid='public.custom_ops_hub_leads'::regclass),
  'anon_privileges', (select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='custom_ops_hub_leads' and grantee='anon'),
  'proconfig', (select proconfig from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure)
);
`));
assert.deepEqual(driftPreserved, {
  policy_count: 1,
  roles: ["anon"],
  anon_privileges: 7,
  proconfig: null,
});

psql(`
drop policy "Allow custom ops hub lead inserts" on public.custom_ops_hub_leads;
create policy "Allow custom ops hub lead inserts"
on public.custom_ops_hub_leads for insert to anon, authenticated with check (true);
grant execute on function public.set_custom_ops_hub_leads_updated_at() to service_role;
revoke execute on function public.set_custom_ops_hub_leads_updated_at() from authenticated;
`);
const functionAclDrift = psql(migration, true);
assert.match(functionAclDrift, /trigger function owner, properties, or ACL drifted/);
assert.equal(psql(`select proconfig is null and proacl is not null from pg_proc where oid='public.set_custom_ops_hub_leads_updated_at()'::regprocedure;`), "t");

psql(`alter table public.custom_ops_hub_leads owner to service_role;`);
const ownerDrift = psql(migration, true);
assert.match(ownerDrift, /RLS state drifted/);
assert.equal(psql(`select pg_get_userbyid(relowner) || '|' || (select count(*)::text from pg_policy where polrelid='public.custom_ops_hub_leads'::regclass) from pg_class where oid='public.custom_ops_hub_leads'::regclass;`), "service_role|1");

console.log(
  "OPS_DRAG_REPORT_SUPABASE_POSTGRES_PASS exact_before=PASS apply=PASS service_role_select_insert_update_only=PASS owner_delete_only=PASS trigger_without_execute=PASS rollback=EXACT policy_acl_owner_drift_abort=ATOMIC",
);
