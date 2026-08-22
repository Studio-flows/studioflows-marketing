-- REVIEWED ROLLBACK ARTIFACT ONLY: do not apply without the separate live-schema gate.
drop function if exists public.release_ops_drag_retention_claim(uuid, text, text, timestamptz);
drop function if exists public.apply_ops_drag_retention_action(uuid, text, jsonb, jsonb);
drop function if exists public.claim_ops_drag_retention_batch(timestamptz, text, timestamptz, integer);
drop function if exists public.ops_drag_retention_terminal_at(jsonb);
drop function if exists public.ops_drag_try_integer(text);
drop function if exists public.ops_drag_try_timestamptz(text);

drop index if exists public.custom_ops_hub_leads_retention_due_idx;
drop index if exists public.ops_drag_retention_receipts_record_chain_idx;

alter table public.custom_ops_hub_leads
  drop constraint if exists custom_ops_hub_leads_retention_attempts_check,
  drop constraint if exists custom_ops_hub_leads_retention_stage_check,
  drop column if exists ops_drag_retention_last_blocker_code,
  drop column if exists ops_drag_retention_attempts,
  drop column if exists ops_drag_retention_lease_acquired_at,
  drop column if exists ops_drag_retention_lease_owner,
  drop column if exists ops_drag_retention_due_at,
  drop column if exists ops_drag_retention_stage,
  drop column if exists ops_drag_last_legitimate_activity_at;

drop table if exists public.ops_drag_retention_receipts;
drop table if exists public.ops_drag_retention_cursor;
