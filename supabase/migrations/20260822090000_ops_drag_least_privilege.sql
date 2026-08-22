begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $migration_precheck$
declare
  v_table regclass := to_regclass('public.custom_ops_hub_leads');
  v_function regprocedure := to_regprocedure('public.set_custom_ops_hub_leads_updated_at()');
  v_pgcrypto_schema name;
  v_definition text;
  v_definition_hash text;
  v_acl_contract text;
  v_acl_fingerprint text;
  v_expected_pre_privileges constant text[] := array[
    'DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
  ];
begin
  if v_table is null then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: target table is missing';
  end if;
  if v_function is null then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: trigger function is missing';
  end if;

  select n.nspname
  into v_pgcrypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';
  if v_pgcrypto_schema is null then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: pgcrypto is missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = v_table
      and c.relkind = 'r'
      and c.relowner = 'postgres'::regrole
      and c.relrowsecurity
      and not c.relforcerowsecurity
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: RLS state drifted';
  end if;

  if (
    select count(*)
    from pg_policy p
    where p.polrelid = v_table
  ) <> 1 or not exists (
    select 1
    from pg_policy p
    where p.polrelid = v_table
      and p.polname = 'Allow custom ops hub lead inserts'
      and p.polcmd = 'a'
      and p.polpermissive
      and p.polqual is null
      and regexp_replace(pg_get_expr(p.polwithcheck, p.polrelid), '[\s()]', '', 'g') = 'true'
      and (
        select array_agg(r.rolname order by r.rolname)
        from unnest(p.polroles) role_oid
        join pg_roles r on r.oid = role_oid
      ) = array['anon', 'authenticated']::name[]
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: policy state drifted';
  end if;

  if exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    where c.oid = v_table and acl.grantee = 0
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: PUBLIC table privileges drifted';
  end if;

  if exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    left join pg_roles grantee on grantee.oid = acl.grantee
    where c.oid = v_table
      and acl.grantee <> c.relowner
      and coalesce(grantee.rolname, '') not in ('anon', 'authenticated', 'service_role')
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: unexpected table grantee';
  end if;

  if exists (
    select 1
    from unnest(array['anon', 'authenticated', 'service_role']) expected_role
    where (
      select array_agg(acl.privilege_type order by acl.privilege_type)
      from pg_class c
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
      join pg_roles grantee on grantee.oid = acl.grantee
      where c.oid = v_table
        and grantee.rolname = expected_role
        and not acl.is_grantable
    ) is distinct from v_expected_pre_privileges
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: role grant state drifted';
  end if;

  if (
    select count(*)
    from pg_trigger t
    where t.tgrelid = v_table and not t.tgisinternal
  ) <> 1 or not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = v_table
      and t.tgname = 'trg_set_custom_ops_hub_leads_updated_at'
      and t.tgfoid = v_function
      and t.tgtype = 19
      and t.tgenabled = 'O'
      and not t.tgisinternal
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: trigger state drifted';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_language l on l.oid = p.prolang
    where p.oid = v_function
      and l.lanname = 'plpgsql'
      and p.prorettype = 'trigger'::regtype
      and p.pronargs = 0
      and p.proowner = 'postgres'::regrole
      and not p.prosecdef
      and p.proconfig is null
      and p.proacl is null
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: trigger function owner, properties, or ACL drifted';
  end if;
  if exists (
    select 1
    from unnest(array['anon', 'authenticated', 'service_role']) role_name
    where not has_function_privilege(role_name, v_function, 'EXECUTE')
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: default function EXECUTE state drifted';
  end if;

  select format(
    'owner=%s|proacl=%s|public=%s|anon=%s|authenticated=%s|service_role=%s',
    pg_get_userbyid(p.proowner),
    case when p.proacl is null then 'NULL' else p.proacl::text end,
    case when exists (
      select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
    ) then 'EXECUTE' else 'NONE' end,
    case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'EXECUTE' else 'NONE' end,
    case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'EXECUTE' else 'NONE' end,
    case when has_function_privilege('service_role', p.oid, 'EXECUTE') then 'EXECUTE' else 'NONE' end
  ) into v_acl_contract
  from pg_proc p where p.oid = v_function;
  execute format(
    'select encode(%I.digest(convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_pgcrypto_schema
  ) into v_acl_fingerprint using v_acl_contract;
  if v_acl_fingerprint <> '1bfb32393dc2741a0437bf56888312d0e5af9085de949df91a822ed8c00bac79' then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: function ACL fingerprint mismatch';
  end if;

  select pg_get_functiondef(v_function) into v_definition;
  execute format(
    'select encode(%I.digest(convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_pgcrypto_schema
  ) into v_definition_hash using v_definition;
  if v_definition_hash <> '84bee0ca31f59de421bc59cf960473b388d32961000c7cff8988d4ed63d101eb' then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_PRECONDITION: trigger function definition drifted';
  end if;
end
$migration_precheck$;

drop policy "Allow custom ops hub lead inserts" on public.custom_ops_hub_leads;
revoke all privileges on table public.custom_ops_hub_leads from public, anon, authenticated;
revoke all privileges on table public.custom_ops_hub_leads from service_role;
grant select, insert, update on table public.custom_ops_hub_leads to service_role;
alter table public.custom_ops_hub_leads enable row level security;
revoke execute on function public.set_custom_ops_hub_leads_updated_at()
  from public, anon, authenticated, service_role;
alter function public.set_custom_ops_hub_leads_updated_at() set search_path = pg_catalog;

do $migration_postcheck$
declare
  v_table regclass := 'public.custom_ops_hub_leads'::regclass;
  v_function regprocedure := 'public.set_custom_ops_hub_leads_updated_at()'::regprocedure;
  v_expected_privileges constant text[] := array[
    'INSERT', 'SELECT', 'UPDATE'
  ];
begin
  if not exists (
    select 1 from pg_class c
    where c.oid = v_table
      and c.relowner = 'postgres'::regrole
      and c.relrowsecurity
      and not c.relforcerowsecurity
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: RLS state is invalid';
  end if;
  if exists (select 1 from pg_policy p where p.polrelid = v_table) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: client policy remains';
  end if;
  if exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    left join pg_roles grantee on grantee.oid = acl.grantee
    where c.oid = v_table
      and (acl.grantee = 0 or grantee.rolname in ('anon', 'authenticated'))
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: client table privilege remains';
  end if;
  if (
    select array_agg(acl.privilege_type order by acl.privilege_type)
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where c.oid = v_table
      and grantee.rolname = 'service_role'
      and not acl.is_grantable
  ) is distinct from v_expected_privileges then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: service_role grants changed';
  end if;
  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_function
      and p.proowner = 'postgres'::regrole
      and not p.prosecdef
      and p.proconfig = array['search_path=pg_catalog']::text[]
      and p.proacl is not null
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: safe search_path is absent';
  end if;
  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = v_function
      and acl.grantee <> p.proowner
  ) or not has_function_privilege('postgres', v_function, 'EXECUTE') or exists (
    select 1
    from unnest(array['anon', 'authenticated', 'service_role']) role_name
    where has_function_privilege(role_name, v_function, 'EXECUTE')
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: function EXECUTE is not owner-only';
  end if;
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = v_table
      and t.tgname = 'trg_set_custom_ops_hub_leads_updated_at'
      and t.tgfoid = v_function
      and t.tgtype = 19
      and t.tgenabled = 'O'
      and not t.tgisinternal
  ) then
    raise exception 'OPS_DRAG_LEAST_PRIVILEGE_POSTCHECK: trigger binding changed';
  end if;
end
$migration_postcheck$;

commit;
