-- REVIEWED ARTIFACT ONLY: do not apply until the separate live-schema gate is accepted.
create table if not exists public.ops_drag_retention_cursor (
  worker_name text primary key,
  after_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_drag_retention_receipts (
  id bigint generated always as identity primary key,
  policy_version text not null,
  record_id_hash text not null check (record_id_hash ~ '^[0-9a-f]{64}$'),
  data_class text not null,
  action text not null check (action in ('DELETE', 'REDUCE', 'BLOCKED')),
  due_at timestamptz,
  applied_at timestamptz not null,
  lease_owner_hash text not null check (lease_owner_hash ~ '^[0-9a-f]{64}$'),
  attempt integer not null check (attempt between 1 and 3),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  previous_receipt_hash text check (previous_receipt_hash is null or previous_receipt_hash ~ '^[0-9a-f]{64}$'),
  receipt_hash text not null unique check (receipt_hash ~ '^[0-9a-f]{64}$'),
  blocker_code text,
  created_at timestamptz not null default now()
);

alter table public.ops_drag_retention_cursor enable row level security;
alter table public.ops_drag_retention_receipts enable row level security;
revoke all on table public.ops_drag_retention_cursor from public, anon, authenticated;
revoke all on table public.ops_drag_retention_receipts from public, anon, authenticated;
revoke all on sequence public.ops_drag_retention_receipts_id_seq from public, anon, authenticated;

alter table public.custom_ops_hub_leads
  add column if not exists ops_drag_last_legitimate_activity_at timestamptz,
  add column if not exists ops_drag_retention_stage text not null default 'UNINITIALIZED',
  add column if not exists ops_drag_retention_due_at timestamptz,
  add column if not exists ops_drag_retention_lease_owner text,
  add column if not exists ops_drag_retention_lease_acquired_at timestamptz,
  add column if not exists ops_drag_retention_attempts integer not null default 0,
  add column if not exists ops_drag_retention_last_blocker_code text;

update public.custom_ops_hub_leads
   set ops_drag_last_legitimate_activity_at = updated_at
 where ops_drag_last_legitimate_activity_at is null;

alter table public.custom_ops_hub_leads
  alter column ops_drag_last_legitimate_activity_at set default now(),
  alter column ops_drag_last_legitimate_activity_at set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'custom_ops_hub_leads_retention_stage_check'
       and conrelid = 'public.custom_ops_hub_leads'::regclass
  ) then
    alter table public.custom_ops_hub_leads
      add constraint custom_ops_hub_leads_retention_stage_check check (
        ops_drag_retention_stage in (
          'UNINITIALIZED',
          'AWAITING_TERMINAL',
          'UNPAID_SUBMISSION',
          'RAW_PAID_SUBMISSION',
          'EMAIL_ORDER_MAPPING',
          'SUPPORT_TRANSCRIPT',
          'DETAILED_RECEIPT_LEDGER',
          'REDUCED_TRANSACTION_RECORD',
          'COMPLETE',
          'BLOCKED'
        )
      );
  end if;
  if not exists (
    select 1
      from pg_constraint
     where conname = 'custom_ops_hub_leads_retention_attempts_check'
       and conrelid = 'public.custom_ops_hub_leads'::regclass
  ) then
    alter table public.custom_ops_hub_leads
      add constraint custom_ops_hub_leads_retention_attempts_check
      check (ops_drag_retention_attempts between 0 and 3);
  end if;
end $$;

create index if not exists custom_ops_hub_leads_retention_due_idx
  on public.custom_ops_hub_leads (ops_drag_retention_due_at, id)
  where ops_drag_retention_due_at is not null
    and ops_drag_retention_stage not in ('COMPLETE', 'BLOCKED');

create index if not exists ops_drag_retention_receipts_record_chain_idx
  on public.ops_drag_retention_receipts (record_id_hash, applied_at desc, id desc);

create or replace function public.ops_drag_try_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.ops_drag_retention_terminal_at(p_metadata jsonb)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select max(public.ops_drag_try_timestamptz(receipt.value ->> 'recorded_at'))
    from jsonb_array_elements(
      case
        when jsonb_typeof(p_metadata #> '{ops_drag_report_order,receipts}') = 'array'
          then p_metadata #> '{ops_drag_report_order,receipts}'
        else '[]'::jsonb
      end
    ) as receipt(value)
   where receipt.value ->> 'kind' = 'ORDER_TERMINAL';
$$;

create or replace function public.ops_drag_retention_order_lifecycle(p_metadata jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_metadata #> '{ops_drag_report_order,payment}') = 'object'
      and coalesce(p_metadata #>> '{ops_drag_report_order,automation,terminal_disposition}', '') <> ''
      then 'RAW_PAID_SUBMISSION'
    when jsonb_typeof(p_metadata #> '{ops_drag_report_order,payment}') = 'object'
      then 'AWAITING_TERMINAL'
    else 'UNPAID_SUBMISSION'
  end;
$$;

create or replace function public.ops_drag_retention_order_due_at(
  p_metadata jsonb,
  p_last_legitimate_activity_at timestamptz
)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select case public.ops_drag_retention_order_lifecycle(p_metadata)
    when 'UNPAID_SUBMISSION' then p_last_legitimate_activity_at + interval '7 days'
    when 'RAW_PAID_SUBMISSION' then public.ops_drag_retention_terminal_at(p_metadata) + interval '30 days'
    else null
  end;
$$;

create or replace function public.ops_drag_try_integer(p_value text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;
  return p_value::integer;
exception when others then
  return null;
end;
$$;

create or replace function public.ops_drag_retention_hold_covers(p_hold jsonb, p_stage text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p_hold) = 'object'
    and coalesce(p_hold ->> 'released_at', '') = ''
    and case
      when jsonb_typeof(p_hold -> 'data_classes') is distinct from 'array' then true
      when jsonb_array_length(p_hold -> 'data_classes') = 0 then true
      else (p_hold -> 'data_classes') ? 'ALL'
        or (p_hold -> 'data_classes') ? p_stage
    end,
    false
  );
$$;

create or replace function public.ops_drag_retention_dispute_state(p_metadata jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_dispute jsonb;
  v_resolved_at_raw text;
  v_status text;
begin
  if not coalesce(p_metadata ? 'ops_drag_report_dispute', false) then
    return 'ABSENT';
  end if;
  v_dispute := p_metadata -> 'ops_drag_report_dispute';
  if jsonb_typeof(v_dispute) is distinct from 'object' then
    return 'MALFORMED';
  end if;
  v_resolved_at_raw := v_dispute ->> 'resolved_at';
  if v_resolved_at_raw is null or btrim(v_resolved_at_raw) = '' then
    return 'UNRESOLVED';
  end if;
  if public.ops_drag_try_timestamptz(v_resolved_at_raw) is null then
    return 'MALFORMED';
  end if;
  v_status := upper(btrim(coalesce(v_dispute ->> 'status', '')));
  if v_status not in ('RESOLVED', 'WON', 'LOST', 'CLOSED', 'WARNING_CLOSED') then
    return 'UNRESOLVED';
  end if;
  return 'RESOLVED';
end;
$$;

create or replace function public.ops_drag_retention_detailed_due_at(p_metadata jsonb)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  with basis as (
    select
      public.ops_drag_retention_terminal_at(p_metadata) as terminal_at,
      public.ops_drag_retention_dispute_state(p_metadata) as dispute_state,
      public.ops_drag_try_timestamptz(
        p_metadata #>> '{ops_drag_report_dispute,resolved_at}'
      ) as dispute_resolved_at
  )
  select case
    when dispute_state in ('UNRESOLVED', 'MALFORMED') then null
    when terminal_at is null then null
    when dispute_state = 'ABSENT' then terminal_at + interval '24 months'
    else greatest(terminal_at, dispute_resolved_at) + interval '24 months'
  end
  from basis;
$$;

create or replace function public.ops_drag_retention_reduced_metadata_valid(p_metadata jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_reduced jsonb;
begin
  if jsonb_typeof(p_metadata) is distinct from 'object'
     or not (p_metadata ? 'ops_drag_reduced_transaction_record')
     or (select count(*) from jsonb_object_keys(p_metadata)) <> 1 then
    return false;
  end if;
  v_reduced := p_metadata -> 'ops_drag_reduced_transaction_record';
  if jsonb_typeof(v_reduced) is distinct from 'object' then
    return false;
  end if;
  if exists (
    select 1 from jsonb_object_keys(v_reduced) as key(value)
     where key.value not in (
       'order_reference', 'amount', 'currency', 'tax_config_reference',
       'terminal_disposition', 'refund_dispute_status', 'transaction_at',
       'terminal_at', 'receipt_hash'
     )
  ) then
    return false;
  end if;
  if jsonb_typeof(v_reduced -> 'order_reference') is distinct from 'string'
     or (v_reduced ->> 'order_reference') !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(v_reduced -> 'amount') is distinct from 'number'
     or (v_reduced ->> 'amount') !~ '^[0-9]+$'
     or (v_reduced ->> 'amount')::numeric < 0
     or jsonb_typeof(v_reduced -> 'currency') is distinct from 'string'
     or (v_reduced ->> 'currency') !~ '^[a-z]{3}$'
     or public.ops_drag_try_timestamptz(v_reduced ->> 'transaction_at') is null
     or public.ops_drag_try_timestamptz(v_reduced ->> 'terminal_at') is null
     or jsonb_typeof(v_reduced -> 'receipt_hash') is distinct from 'string'
     or (v_reduced ->> 'receipt_hash') !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  if (v_reduced ? 'tax_config_reference')
     and jsonb_typeof(v_reduced -> 'tax_config_reference') is distinct from 'null'
     and (
       jsonb_typeof(v_reduced -> 'tax_config_reference') is distinct from 'string'
       or v_reduced ->> 'tax_config_reference' <> 'txcd_10701410'
     ) then
    return false;
  end if;
  if (v_reduced ? 'terminal_disposition')
     and jsonb_typeof(v_reduced -> 'terminal_disposition') is distinct from 'null'
     and (
       jsonb_typeof(v_reduced -> 'terminal_disposition') is distinct from 'string'
       or v_reduced ->> 'terminal_disposition' not in ('DELIVERED', 'REFUNDED')
     ) then
    return false;
  end if;
  if (v_reduced ? 'refund_dispute_status')
     and jsonb_typeof(v_reduced -> 'refund_dispute_status') is distinct from 'null'
     and (
       jsonb_typeof(v_reduced -> 'refund_dispute_status') is distinct from 'string'
       or v_reduced ->> 'refund_dispute_status' not in (
         'NOT_REQUIRED', 'REQUIRED', 'OWNED', 'CREATED', 'RETRYABLE', 'SUCCEEDED', 'FAILED',
         'RESOLVED', 'WON', 'LOST', 'CLOSED', 'WARNING_CLOSED'
       )
     ) then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function public.ops_drag_try_timestamptz(text) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_terminal_at(jsonb) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_order_lifecycle(jsonb) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_order_due_at(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.ops_drag_try_integer(text) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_hold_covers(jsonb, text) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_dispute_state(jsonb) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_detailed_due_at(jsonb) from public, anon, authenticated;
revoke all on function public.ops_drag_retention_reduced_metadata_valid(jsonb) from public, anon, authenticated;
grant execute on function public.ops_drag_try_timestamptz(text) to service_role;
grant execute on function public.ops_drag_retention_terminal_at(jsonb) to service_role;
grant execute on function public.ops_drag_retention_order_lifecycle(jsonb) to service_role;
grant execute on function public.ops_drag_retention_order_due_at(jsonb, timestamptz) to service_role;
grant execute on function public.ops_drag_try_integer(text) to service_role;
grant execute on function public.ops_drag_retention_hold_covers(jsonb, text) to service_role;
grant execute on function public.ops_drag_retention_dispute_state(jsonb) to service_role;
grant execute on function public.ops_drag_retention_detailed_due_at(jsonb) to service_role;
grant execute on function public.ops_drag_retention_reduced_metadata_valid(jsonb) to service_role;

create or replace function public.claim_ops_drag_retention_batch(
  p_recorded_at timestamptz,
  p_owner text,
  p_stale_before timestamptz,
  p_limit integer default 10
)
returns table(
  record_id uuid,
  data_class text,
  last_activity_at timestamptz,
  terminal_at timestamptz,
  support_closed_at timestamptz,
  dispute_resolved_at timestamptz,
  transaction_at timestamptz,
  legal_hold jsonb,
  lease_owner text,
  lease_acquired_at timestamptz,
  lease_attempts integer,
  previous_receipt_hash text,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_after_id uuid;
  v_last_id uuid;
  v_lead public.custom_ops_hub_leads%rowtype;
  v_claimed public.custom_ops_hub_leads%rowtype;
  v_stage text;
  v_due_at timestamptz;
  v_terminal_at timestamptz;
  v_support_closed_at timestamptz;
  v_dispute_resolved_at timestamptz;
  v_dispute_state text;
  v_transaction_at timestamptz;
  v_hold jsonb;
  v_record_hash text;
  v_current_lifecycle text;
  v_current_order_due_at timestamptz;
begin
  if p_limit < 1 or p_limit > 10 then
    raise exception 'retention batch limit must be between 1 and 10';
  end if;
  if p_owner is null or length(btrim(p_owner)) < 16 then
    raise exception 'retention owner is invalid';
  end if;
  if p_stale_before >= p_recorded_at then
    raise exception 'retention stale boundary is invalid';
  end if;

  insert into public.ops_drag_retention_cursor (worker_name, after_id)
  values ('ops_drag_retention_v1', null)
  on conflict (worker_name) do nothing;

  select cursor.after_id
    into v_after_id
    from public.ops_drag_retention_cursor as cursor
   where cursor.worker_name = 'ops_drag_retention_v1'
   for update;

  if not exists (
    select 1
      from public.custom_ops_hub_leads as candidate
     where (
       candidate.metadata ? 'ops_drag_report_order'
       or candidate.source_page = 'ops-drag-report'
       or candidate.ops_drag_retention_stage <> 'UNINITIALIZED'
     )
       and (v_after_id is null or candidate.id > v_after_id)
  ) then
    v_after_id := null;
  end if;

  for v_lead in
    select candidate.*
      from public.custom_ops_hub_leads as candidate
     where (
       candidate.metadata ? 'ops_drag_report_order'
       or candidate.source_page = 'ops-drag-report'
       or candidate.ops_drag_retention_stage <> 'UNINITIALIZED'
     )
       and (v_after_id is null or candidate.id > v_after_id)
     order by candidate.id asc
     limit p_limit
     for update skip locked
  loop
    v_last_id := v_lead.id;
    v_stage := v_lead.ops_drag_retention_stage;
    v_due_at := v_lead.ops_drag_retention_due_at;
    v_terminal_at := public.ops_drag_retention_terminal_at(v_lead.metadata);
    v_support_closed_at := public.ops_drag_try_timestamptz(
      coalesce(
        v_lead.metadata #>> '{ops_drag_report_support,closed_at}',
        v_lead.metadata #>> '{ops_drag_support_transcript,closed_at}'
      )
    );
    v_dispute_resolved_at := public.ops_drag_try_timestamptz(
      v_lead.metadata #>> '{ops_drag_report_dispute,resolved_at}'
    );
    v_dispute_state := public.ops_drag_retention_dispute_state(v_lead.metadata);
    v_transaction_at := public.ops_drag_try_timestamptz(
      v_lead.metadata #>> '{ops_drag_report_order,payment,paidAt}'
    );

    if v_stage in ('UNINITIALIZED', 'AWAITING_TERMINAL', 'UNPAID_SUBMISSION') then
      v_current_lifecycle := public.ops_drag_retention_order_lifecycle(v_lead.metadata);
      v_current_order_due_at := public.ops_drag_retention_order_due_at(
        v_lead.metadata,
        v_lead.ops_drag_last_legitimate_activity_at
      );
      if v_stage is distinct from v_current_lifecycle
         or v_due_at is distinct from v_current_order_due_at then
        update public.custom_ops_hub_leads
           set ops_drag_retention_stage = v_current_lifecycle,
               ops_drag_retention_due_at = v_current_order_due_at,
               ops_drag_retention_lease_owner = null,
               ops_drag_retention_lease_acquired_at = null,
               ops_drag_retention_attempts = case
                 when ops_drag_retention_lease_owner is null then ops_drag_retention_attempts
                 else greatest(ops_drag_retention_attempts - 1, 0)
               end,
               ops_drag_retention_last_blocker_code = case
                 when v_current_lifecycle = 'RAW_PAID_SUBMISSION' and v_current_order_due_at is null
                   then 'RETENTION_TERMINAL_TIMESTAMP_INVALID'
                 else null
               end
         where id = v_lead.id
         returning * into v_lead;
      end if;
      v_stage := v_current_lifecycle;
      v_due_at := v_current_order_due_at;
    elsif v_stage = 'DETAILED_RECEIPT_LEDGER' then
      v_due_at := public.ops_drag_retention_detailed_due_at(v_lead.metadata);
      update public.custom_ops_hub_leads
         set ops_drag_retention_due_at = v_due_at,
             ops_drag_retention_last_blocker_code = case
               when v_dispute_state = 'UNRESOLVED' then 'RETENTION_DISPUTE_UNRESOLVED'
               when v_dispute_state = 'MALFORMED' then 'RETENTION_DISPUTE_TIMESTAMP_INVALID'
               when v_due_at is null then 'RETENTION_DETAILED_DUE_BASIS_INVALID'
               else null
             end
       where id = v_lead.id;
    elsif v_stage = 'SUPPORT_TRANSCRIPT' and v_due_at is null and v_support_closed_at is not null then
      v_due_at := v_support_closed_at + interval '90 days';
      update public.custom_ops_hub_leads
         set ops_drag_retention_due_at = v_due_at
       where id = v_lead.id;
    elsif v_stage = 'SUPPORT_TRANSCRIPT'
       and v_due_at is null
       and coalesce(
         v_lead.metadata #>> '{ops_drag_report_support,closed_at}',
         v_lead.metadata #>> '{ops_drag_support_transcript,closed_at}'
       ) is not null then
      v_due_at := p_recorded_at;
      update public.custom_ops_hub_leads
         set ops_drag_retention_due_at = v_due_at,
             ops_drag_retention_last_blocker_code = 'RETENTION_SUPPORT_TIMESTAMP_INVALID'
       where id = v_lead.id;
    end if;

    if v_stage in ('BLOCKED', 'COMPLETE', 'AWAITING_TERMINAL') or v_due_at is null or v_due_at > p_recorded_at then
      continue;
    end if;

    v_hold := v_lead.metadata -> 'ops_drag_retention_legal_hold';
    if public.ops_drag_retention_hold_covers(v_hold, v_stage) then
      continue;
    end if;

    if v_lead.ops_drag_retention_lease_acquired_at is not null
       and v_lead.ops_drag_retention_lease_acquired_at >= p_stale_before then
      continue;
    end if;
    if v_lead.ops_drag_retention_attempts >= 3 then
      update public.custom_ops_hub_leads
         set ops_drag_retention_stage = 'BLOCKED',
             ops_drag_retention_due_at = null,
             ops_drag_retention_last_blocker_code = 'RETENTION_RETRY_BUDGET_EXHAUSTED'
       where id = v_lead.id;
      continue;
    end if;

    update public.custom_ops_hub_leads
       set ops_drag_retention_lease_owner = p_owner,
           ops_drag_retention_lease_acquired_at = p_recorded_at,
           ops_drag_retention_attempts = ops_drag_retention_attempts + 1,
           ops_drag_retention_last_blocker_code = null
     where id = v_lead.id
       and (
         ops_drag_retention_lease_acquired_at is null
         or ops_drag_retention_lease_acquired_at < p_stale_before
       )
     returning * into v_claimed;

    if v_claimed.id is null then
      continue;
    end if;

    v_record_hash := encode(extensions.digest(v_claimed.id::text, 'sha256'), 'hex');
    record_id := v_claimed.id;
    data_class := v_claimed.ops_drag_retention_stage;
    last_activity_at := v_claimed.ops_drag_last_legitimate_activity_at;
    terminal_at := public.ops_drag_retention_terminal_at(v_claimed.metadata);
    support_closed_at := v_support_closed_at;
    dispute_resolved_at := v_dispute_resolved_at;
    transaction_at := v_transaction_at;
    legal_hold := v_hold;
    lease_owner := v_claimed.ops_drag_retention_lease_owner;
    lease_acquired_at := v_claimed.ops_drag_retention_lease_acquired_at;
    lease_attempts := v_claimed.ops_drag_retention_attempts;
    select receipt.receipt_hash
      into previous_receipt_hash
      from public.ops_drag_retention_receipts as receipt
     where receipt.record_id_hash = v_record_hash
     order by receipt.applied_at desc, receipt.id desc
     limit 1;
    payload := jsonb_build_object('runtime_row', to_jsonb(v_claimed)) || jsonb_strip_nulls(jsonb_build_object(
      'order_reference', case
        when coalesce(v_claimed.metadata #>> '{ops_drag_report_order,order_id}', '') <> ''
          then encode(extensions.digest(v_claimed.metadata #>> '{ops_drag_report_order,order_id}', 'sha256'), 'hex')
        else null
      end,
      'amount', public.ops_drag_try_integer(v_claimed.metadata #>> '{ops_drag_report_order,payment,amountTotal}'),
      'currency', v_claimed.metadata #>> '{ops_drag_report_order,payment,currency}',
      'tax_config_reference', v_claimed.metadata #>> '{ops_drag_tax_config_reference}',
      'terminal_disposition', v_claimed.metadata #>> '{ops_drag_report_order,automation,terminal_disposition}',
      'refund_dispute_status', coalesce(
        v_claimed.metadata #>> '{ops_drag_report_dispute,status}',
        v_claimed.metadata #>> '{ops_drag_report_order,automation,refund,status}'
      ),
      'transaction_at', v_transaction_at,
      'terminal_at', terminal_at,
      'receipt_hash', v_claimed.metadata #>> '{ops_drag_report_order,receipts,-1,receipt_hash}'
    ));
    return next;
    v_claimed := null;
  end loop;

  update public.ops_drag_retention_cursor
     set after_id = v_last_id,
         updated_at = p_recorded_at
   where worker_name = 'ops_drag_retention_v1';
end;
$$;

create or replace function public.apply_ops_drag_retention_action(
  p_record_id uuid,
  p_owner text,
  p_patch jsonb,
  p_receipt jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.custom_ops_hub_leads%rowtype;
  v_columns jsonb;
  v_previous text;
  v_record_hash text;
  v_expected_stage text;
  v_next_stage text;
  v_next_due_at timestamptz;
  v_current_due_at timestamptz;
  v_applied_at timestamptz;
  v_dispute_state text;
  v_delete boolean;
  v_current_lifecycle text;
begin
  select * into v_lead
    from public.custom_ops_hub_leads
   where id = p_record_id
   for update;
  if v_lead.id is null then
    raise exception 'retention record does not exist';
  end if;
  if v_lead.ops_drag_retention_lease_owner is distinct from p_owner then
    raise exception 'retention lease owner mismatch';
  end if;

  v_expected_stage := p_patch ->> 'expected_stage';
  if v_expected_stage is distinct from v_lead.ops_drag_retention_stage then
    raise exception 'retention stage changed before action';
  end if;
  if v_expected_stage = 'UNPAID_SUBMISSION' then
    v_current_lifecycle := public.ops_drag_retention_order_lifecycle(v_lead.metadata);
    v_current_due_at := public.ops_drag_retention_order_due_at(
      v_lead.metadata,
      v_lead.ops_drag_last_legitimate_activity_at
    );
    v_applied_at := public.ops_drag_try_timestamptz(p_receipt ->> 'applied_at');
    if v_current_lifecycle is distinct from 'UNPAID_SUBMISSION' then
      update public.custom_ops_hub_leads
         set ops_drag_retention_stage = v_current_lifecycle,
             ops_drag_retention_due_at = v_current_due_at,
             ops_drag_retention_lease_owner = null,
             ops_drag_retention_lease_acquired_at = null,
             ops_drag_retention_attempts = greatest(ops_drag_retention_attempts - 1, 0),
             ops_drag_retention_last_blocker_code = case
               when v_current_lifecycle = 'RAW_PAID_SUBMISSION' and v_current_due_at is null
                 then 'RETENTION_TERMINAL_TIMESTAMP_INVALID'
               else 'RETENTION_RECLASSIFIED_PAID'
             end
       where id = p_record_id;
      return 'DEFERRED';
    end if;
    if v_current_due_at is null
       or v_applied_at is null
       or v_applied_at < v_current_due_at
       or public.ops_drag_try_timestamptz(p_receipt ->> 'due_at') is distinct from v_current_due_at then
      update public.custom_ops_hub_leads
         set ops_drag_retention_due_at = v_current_due_at,
             ops_drag_retention_lease_owner = null,
             ops_drag_retention_lease_acquired_at = null,
             ops_drag_retention_attempts = greatest(ops_drag_retention_attempts - 1, 0),
             ops_drag_retention_last_blocker_code = 'RETENTION_DUE_REBASED'
       where id = p_record_id;
      return 'DEFERRED';
    end if;
  end if;
  if public.ops_drag_retention_hold_covers(
    v_lead.metadata -> 'ops_drag_retention_legal_hold',
    v_expected_stage
  ) then
    update public.custom_ops_hub_leads
       set ops_drag_retention_lease_owner = null,
           ops_drag_retention_lease_acquired_at = null,
           ops_drag_retention_attempts = greatest(ops_drag_retention_attempts - 1, 0),
           ops_drag_retention_last_blocker_code = 'RETENTION_LEGAL_HOLD'
     where id = p_record_id;
    return 'HELD';
  end if;

  if v_expected_stage = 'DETAILED_RECEIPT_LEDGER' then
    v_dispute_state := public.ops_drag_retention_dispute_state(v_lead.metadata);
    v_current_due_at := public.ops_drag_retention_detailed_due_at(v_lead.metadata);
    v_applied_at := public.ops_drag_try_timestamptz(p_receipt ->> 'applied_at');
    if v_current_due_at is null or v_applied_at is null or v_applied_at < v_current_due_at then
      update public.custom_ops_hub_leads
         set ops_drag_retention_due_at = v_current_due_at,
             ops_drag_retention_lease_owner = null,
             ops_drag_retention_lease_acquired_at = null,
             ops_drag_retention_attempts = greatest(ops_drag_retention_attempts - 1, 0),
             ops_drag_retention_last_blocker_code = case
               when v_dispute_state = 'UNRESOLVED' then 'RETENTION_DISPUTE_UNRESOLVED'
               when v_dispute_state = 'MALFORMED' then 'RETENTION_DISPUTE_TIMESTAMP_INVALID'
               when v_current_due_at is null then 'RETENTION_DETAILED_DUE_BASIS_INVALID'
               else 'RETENTION_DUE_REBASED'
             end
       where id = p_record_id;
      return 'DEFERRED';
    end if;
    update public.custom_ops_hub_leads
       set ops_drag_retention_due_at = v_current_due_at
     where id = p_record_id;
  end if;

  v_next_stage := p_patch ->> 'next_stage';
  v_delete := coalesce((p_patch ->> 'delete_row')::boolean, false);
  v_columns := coalesce(p_patch -> 'columns', '{}'::jsonb);
  if jsonb_typeof(v_columns) <> 'object' then
    raise exception 'retention patch columns are invalid';
  end if;
  if not (
    (v_expected_stage = 'RAW_PAID_SUBMISSION' and v_next_stage = 'EMAIL_ORDER_MAPPING' and not v_delete)
    or (v_expected_stage = 'EMAIL_ORDER_MAPPING' and v_next_stage in ('SUPPORT_TRANSCRIPT', 'DETAILED_RECEIPT_LEDGER') and not v_delete)
    or (v_expected_stage = 'SUPPORT_TRANSCRIPT' and v_next_stage = 'DETAILED_RECEIPT_LEDGER' and not v_delete)
    or (v_expected_stage = 'DETAILED_RECEIPT_LEDGER' and v_next_stage = 'REDUCED_TRANSACTION_RECORD' and not v_delete)
    or (v_expected_stage in ('UNPAID_SUBMISSION', 'REDUCED_TRANSACTION_RECORD') and v_next_stage = 'COMPLETE' and v_delete)
  ) then
    raise exception 'retention state transition is invalid';
  end if;
  if exists (
    select 1 from jsonb_object_keys(v_columns) as key(value)
     where key.value not in (
       'full_name', 'work_email', 'company_name', 'company_website', 'business_model',
       'company_stage', 'primary_pain_area', 'highest_cost_bottleneck',
       'highest_cost_bottleneck_other', 'workflow_management', 'frequent_breakdown',
       'frequent_breakdown_detail', 'urgency_window', 'quarter_risk',
       'implementation_ownership', 'budget_range', 'approval_involvement',
       'raw_answers', 'metadata'
     )
  ) then
    raise exception 'retention patch contains a forbidden column';
  end if;
  if v_expected_stage = 'DETAILED_RECEIPT_LEDGER'
     and (
       not (v_columns ? 'metadata')
       or (select count(*) from jsonb_object_keys(v_columns)) <> 1
       or not public.ops_drag_retention_reduced_metadata_valid(v_columns -> 'metadata')
     ) then
    raise exception 'retention reduced metadata is not the exact approved record';
  end if;

  v_record_hash := encode(extensions.digest(p_record_id::text, 'sha256'), 'hex');
  select receipt.receipt_hash
    into v_previous
    from public.ops_drag_retention_receipts as receipt
   where receipt.record_id_hash = v_record_hash
   order by receipt.applied_at desc, receipt.id desc
   limit 1;
  if p_receipt ->> 'record_id_hash' is distinct from v_record_hash
     or p_receipt ->> 'lease_owner_hash' is distinct from encode(extensions.digest(p_owner, 'sha256'), 'hex')
     or coalesce(p_receipt ->> 'previous_receipt_hash', '') is distinct from coalesce(v_previous, '')
     or p_receipt ->> 'data_class' is distinct from v_expected_stage
     or p_receipt ->> 'action' is distinct from (case
       when v_expected_stage = 'DETAILED_RECEIPT_LEDGER' then 'REDUCE'
       else 'DELETE'
     end)
     or (p_receipt ->> 'attempt')::integer is distinct from v_lead.ops_drag_retention_attempts
     or p_receipt ->> 'policy_version' is distinct from 'ops_drag_retention_v1'
     or (v_expected_stage = 'DETAILED_RECEIPT_LEDGER' and public.ops_drag_try_timestamptz(p_receipt ->> 'due_at') is distinct from v_current_due_at)
     or p_receipt ->> 'receipt_hash' !~ '^[0-9a-f]{64}$'
     or p_receipt ->> 'evidence_hash' !~ '^[0-9a-f]{64}$' then
    raise exception 'retention receipt binding is invalid';
  end if;

  insert into public.ops_drag_retention_receipts (
    policy_version, record_id_hash, data_class, action, due_at, applied_at,
    lease_owner_hash, attempt, evidence_hash, previous_receipt_hash, receipt_hash
  ) values (
    p_receipt ->> 'policy_version',
    p_receipt ->> 'record_id_hash',
    p_receipt ->> 'data_class',
    p_receipt ->> 'action',
    public.ops_drag_try_timestamptz(p_receipt ->> 'due_at'),
    (p_receipt ->> 'applied_at')::timestamptz,
    p_receipt ->> 'lease_owner_hash',
    (p_receipt ->> 'attempt')::integer,
    p_receipt ->> 'evidence_hash',
    nullif(p_receipt ->> 'previous_receipt_hash', ''),
    p_receipt ->> 'receipt_hash'
  ) on conflict (receipt_hash) do nothing;

  if v_delete then
    if v_expected_stage not in ('UNPAID_SUBMISSION', 'REDUCED_TRANSACTION_RECORD')
       or v_next_stage <> 'COMPLETE' then
      raise exception 'retention deletion transition is invalid';
    end if;
    delete from public.custom_ops_hub_leads where id = p_record_id;
    return 'APPLIED';
  end if;

  v_next_due_at := public.ops_drag_try_timestamptz(p_patch ->> 'next_due_at');
  update public.custom_ops_hub_leads
     set full_name = case when v_columns ? 'full_name' then v_columns ->> 'full_name' else full_name end,
         work_email = case when v_columns ? 'work_email' then v_columns ->> 'work_email' else work_email end,
         company_name = case when v_columns ? 'company_name' then v_columns ->> 'company_name' else company_name end,
         company_website = case when v_columns ? 'company_website' then nullif(v_columns ->> 'company_website', '') else company_website end,
         business_model = case when v_columns ? 'business_model' then v_columns ->> 'business_model' else business_model end,
         company_stage = case when v_columns ? 'company_stage' then v_columns ->> 'company_stage' else company_stage end,
         primary_pain_area = case when v_columns ? 'primary_pain_area' then v_columns ->> 'primary_pain_area' else primary_pain_area end,
         highest_cost_bottleneck = case when v_columns ? 'highest_cost_bottleneck' then v_columns ->> 'highest_cost_bottleneck' else highest_cost_bottleneck end,
         highest_cost_bottleneck_other = case when v_columns ? 'highest_cost_bottleneck_other' then nullif(v_columns ->> 'highest_cost_bottleneck_other', '') else highest_cost_bottleneck_other end,
         workflow_management = case when v_columns ? 'workflow_management' then array(select jsonb_array_elements_text(v_columns -> 'workflow_management')) else workflow_management end,
         frequent_breakdown = case when v_columns ? 'frequent_breakdown' then v_columns ->> 'frequent_breakdown' else frequent_breakdown end,
         frequent_breakdown_detail = case when v_columns ? 'frequent_breakdown_detail' then v_columns ->> 'frequent_breakdown_detail' else frequent_breakdown_detail end,
         urgency_window = case when v_columns ? 'urgency_window' then v_columns ->> 'urgency_window' else urgency_window end,
         quarter_risk = case when v_columns ? 'quarter_risk' then v_columns ->> 'quarter_risk' else quarter_risk end,
         implementation_ownership = case when v_columns ? 'implementation_ownership' then v_columns ->> 'implementation_ownership' else implementation_ownership end,
         budget_range = case when v_columns ? 'budget_range' then v_columns ->> 'budget_range' else budget_range end,
         approval_involvement = case when v_columns ? 'approval_involvement' then v_columns ->> 'approval_involvement' else approval_involvement end,
         raw_answers = case when v_columns ? 'raw_answers' then v_columns -> 'raw_answers' else raw_answers end,
         metadata = case when v_columns ? 'metadata' then v_columns -> 'metadata' else metadata end,
         ops_drag_retention_stage = v_next_stage,
         ops_drag_retention_due_at = v_next_due_at,
         ops_drag_retention_lease_owner = null,
         ops_drag_retention_lease_acquired_at = null,
         ops_drag_retention_attempts = 0,
         ops_drag_retention_last_blocker_code = null
   where id = p_record_id;
  return 'APPLIED';
end;
$$;

create or replace function public.defer_ops_drag_retention_claim(
  p_record_id uuid,
  p_owner text,
  p_due_at timestamptz,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.custom_ops_hub_leads%rowtype;
begin
  if p_reason not in ('RETENTION_WINDOW_ACTIVE', 'SCOPED_LEGAL_HOLD') then
    raise exception 'retention defer reason is invalid';
  end if;
  select * into v_lead
    from public.custom_ops_hub_leads
   where id = p_record_id
   for update;
  if v_lead.id is null or v_lead.ops_drag_retention_lease_owner is distinct from p_owner then
    raise exception 'retention defer binding is invalid';
  end if;
  update public.custom_ops_hub_leads
     set ops_drag_retention_due_at = p_due_at,
         ops_drag_retention_lease_owner = null,
         ops_drag_retention_lease_acquired_at = null,
         ops_drag_retention_attempts = greatest(ops_drag_retention_attempts - 1, 0),
         ops_drag_retention_last_blocker_code = p_reason
   where id = p_record_id;
  return 'DEFERRED';
end;
$$;

create or replace function public.release_ops_drag_retention_claim(
  p_record_id uuid,
  p_owner text,
  p_blocker_code text,
  p_recorded_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.custom_ops_hub_leads%rowtype;
  v_record_hash text;
  v_owner_hash text;
  v_previous text;
  v_evidence jsonb;
  v_evidence_hash text;
  v_receipt_hash text;
begin
  if p_blocker_code !~ '^[A-Z0-9_: -]{1,128}$' then
    raise exception 'retention blocker code is invalid';
  end if;
  select * into v_lead
    from public.custom_ops_hub_leads
   where id = p_record_id
   for update;
  if v_lead.id is null or v_lead.ops_drag_retention_lease_owner is distinct from p_owner then
    raise exception 'retention claim release binding is invalid';
  end if;
  v_record_hash := encode(extensions.digest(p_record_id::text, 'sha256'), 'hex');
  v_owner_hash := encode(extensions.digest(p_owner, 'sha256'), 'hex');
  select receipt.receipt_hash into v_previous
    from public.ops_drag_retention_receipts as receipt
   where receipt.record_id_hash = v_record_hash
   order by receipt.applied_at desc, receipt.id desc
   limit 1;
  v_evidence := jsonb_build_object(
    'policy_version', 'ops_drag_retention_v1',
    'record_id_hash', v_record_hash,
    'data_class', v_lead.ops_drag_retention_stage,
    'action', 'BLOCKED',
    'applied_at', p_recorded_at,
    'lease_owner_hash', v_owner_hash,
    'attempt', v_lead.ops_drag_retention_attempts,
    'blocker_code', p_blocker_code
  );
  v_evidence_hash := encode(extensions.digest(v_evidence::text, 'sha256'), 'hex');
  v_receipt_hash := encode(extensions.digest((v_evidence || jsonb_build_object(
    'evidence_hash', v_evidence_hash,
    'previous_receipt_hash', v_previous
  ))::text, 'sha256'), 'hex');
  insert into public.ops_drag_retention_receipts (
    policy_version, record_id_hash, data_class, action, applied_at,
    lease_owner_hash, attempt, evidence_hash, previous_receipt_hash, receipt_hash, blocker_code
  ) values (
    'ops_drag_retention_v1', v_record_hash, v_lead.ops_drag_retention_stage, 'BLOCKED', p_recorded_at,
    v_owner_hash, v_lead.ops_drag_retention_attempts, v_evidence_hash, v_previous, v_receipt_hash, p_blocker_code
  ) on conflict (receipt_hash) do nothing;
  update public.custom_ops_hub_leads
     set ops_drag_retention_stage = case when ops_drag_retention_attempts >= 3 then 'BLOCKED' else ops_drag_retention_stage end,
         ops_drag_retention_due_at = case when ops_drag_retention_attempts >= 3 then null else ops_drag_retention_due_at end,
         ops_drag_retention_lease_owner = null,
         ops_drag_retention_lease_acquired_at = null,
         ops_drag_retention_last_blocker_code = p_blocker_code
   where id = p_record_id;
end;
$$;

revoke all on function public.claim_ops_drag_retention_batch(timestamptz, text, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.apply_ops_drag_retention_action(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.defer_ops_drag_retention_claim(uuid, text, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.release_ops_drag_retention_claim(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_ops_drag_retention_batch(timestamptz, text, timestamptz, integer)
  to service_role;
grant execute on function public.apply_ops_drag_retention_action(uuid, text, jsonb, jsonb)
  to service_role;
grant execute on function public.defer_ops_drag_retention_claim(uuid, text, timestamptz, text)
  to service_role;
grant execute on function public.release_ops_drag_retention_claim(uuid, text, text, timestamptz)
  to service_role;
