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
  const row = (await fetchLeadRow(supabase, leadId, "")) as OpsDragLeadRow | null;
  if (!row) throw new Error("Ops Check lead not found");
  return row;
}

export function readLeadEmail(row: OpsDragLeadRow): string {
  const email = typeof row.work_email === "string" ? row.work_email.trim().toLowerCase() : "";
  if (!email) throw new Error("Ops Check lead has no report delivery email");
  return email;
}

export function readFulfillmentReceipt(row: OpsDragLeadRow): Record<string, unknown> | null {
  const metadata = row.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const receipt = metadata.ops_drag_report_fulfillment;
  return receipt && typeof receipt === "object" && !Array.isArray(receipt)
    ? (receipt as Record<string, unknown>)
    : null;
}

export async function storeFulfillmentReceipt(
  supabase: SupabaseClient,
  row: OpsDragLeadRow,
  receipt: Record<string, unknown>
): Promise<void> {
  if (typeof row.id !== "string" || !row.id) throw new Error("Lead storage identifier is missing");
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const { error } = await supabase
    .from("custom_ops_hub_leads")
    .update({ metadata: { ...metadata, ops_drag_report_fulfillment: receipt } })
    .eq("id", row.id);
  if (error) throw new Error(error.message || "Unable to store fulfillment receipt");
}
