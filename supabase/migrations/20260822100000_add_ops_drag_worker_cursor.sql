-- REVIEWED ARTIFACT ONLY: do not apply until the separate live-schema gate is accepted.
create table if not exists public.ops_drag_report_worker_cursor (
  worker_name text primary key,
  after_id uuid,
  updated_at timestamptz not null default now()
);

alter table public.ops_drag_report_worker_cursor enable row level security;
revoke all on table public.ops_drag_report_worker_cursor from public, anon, authenticated;

create index if not exists custom_ops_hub_leads_ops_drag_order_id_idx
  on public.custom_ops_hub_leads (id)
  where metadata ? 'ops_drag_report_order';

create or replace function public.claim_ops_drag_report_worker_batch(
  p_recorded_at timestamptz,
  p_limit integer default 10
)
returns table(id uuid, metadata jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_after_id uuid;
  v_last_id uuid;
begin
  if p_limit < 1 or p_limit > 10 then
    raise exception 'worker batch limit must be between 1 and 10';
  end if;

  insert into public.ops_drag_report_worker_cursor (worker_name, after_id)
  values ('ops_drag_paid_fulfillment_v1', null)
  on conflict (worker_name) do nothing;

  select cursor.after_id
    into v_after_id
    from public.ops_drag_report_worker_cursor as cursor
   where cursor.worker_name = 'ops_drag_paid_fulfillment_v1'
   for update;

  if not exists (
    select 1
      from public.custom_ops_hub_leads as lead
     where lead.metadata ? 'ops_drag_report_order'
       and (v_after_id is null or lead.id > v_after_id)
  ) then
    v_after_id := null;
  end if;

  select page.id
    into v_last_id
    from (
      select lead.id
        from public.custom_ops_hub_leads as lead
       where lead.metadata ? 'ops_drag_report_order'
         and (v_after_id is null or lead.id > v_after_id)
       order by lead.id asc
       limit p_limit
    ) as page
   order by page.id desc
   limit 1;

  update public.ops_drag_report_worker_cursor
     set after_id = v_last_id,
         updated_at = now()
   where worker_name = 'ops_drag_paid_fulfillment_v1';

  return query
  select page.id, page.metadata
    from (
      select lead.id, lead.metadata
        from public.custom_ops_hub_leads as lead
       where lead.metadata ? 'ops_drag_report_order'
         and (v_after_id is null or lead.id > v_after_id)
       order by lead.id asc
       limit p_limit
    ) as page
   where jsonb_typeof(page.metadata #> '{ops_drag_report_order,payment}') = 'object'
     and coalesce(page.metadata #>> '{ops_drag_report_order,automation,terminal_disposition}', '') = ''
     and (
       jsonb_typeof(page.metadata #> '{ops_drag_report_order,automation}') is null
       or jsonb_typeof(page.metadata #> '{ops_drag_report_order,automation}') = 'null'
       or page.metadata #>> '{ops_drag_report_order,automation,refund,status}' in ('REQUIRED', 'RETRYABLE', 'OWNED')
       or page.metadata #>> '{ops_drag_report_order,automation,generation,status}' in ('PENDING', 'IN_PROGRESS', 'RETRYABLE')
       or page.metadata #>> '{ops_drag_report_order,automation,delivery,status}' in ('PENDING', 'RETRYABLE', 'SUBMITTING')
       or (
         page.metadata #>> '{ops_drag_report_order,automation,delivery,status}' in ('SUBMITTED', 'ACCEPTED', 'QUEUED', 'SENT')
         and (page.metadata #>> '{ops_drag_report_order,automation,sla,refund_eligible_at}')::timestamptz <= p_recorded_at
       )
     )
   order by page.id asc;
end;
$$;

revoke all on function public.claim_ops_drag_report_worker_batch(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.claim_ops_drag_report_worker_batch(timestamptz, integer)
  to service_role;
