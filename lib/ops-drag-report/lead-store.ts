import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchLeadRow } from "@/lib/ops-teardown/load-teardown-sheet";

export type OpsDragLeadRow = Record<string, unknown> & {
  id?: string;
  work_email?: string;
  metadata?: Record<string, unknown>;
};

export async function loadOpsDragLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<OpsDragLeadRow> {
  const row = (await fetchLeadRow(supabase, leadId)) as OpsDragLeadRow | null;
  if (!row) throw new Error("Ops Check lead not found");
  return row;
}

export function readLeadEmail(row: OpsDragLeadRow): string {
  const email = typeof row.work_email === "string" ? row.work_email.trim().toLowerCase() : "";
  if (!email) throw new Error("Ops Check lead has no report delivery email");
  return email;
}
