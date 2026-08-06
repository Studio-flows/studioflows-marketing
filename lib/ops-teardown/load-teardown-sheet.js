import { createMarketingSupabaseServerClient } from "../supabase-server.js";
import {
  buildOpsTeardownSheet,
  mapLeadRowToTeardownInput,
} from "./build-teardown-sheet.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export async function fetchLeadRow(supabase, leadId, email) {
  if (isUuid(leadId)) {
    const byId = await supabase.from("custom_ops_hub_leads").select("*").eq("id", leadId).maybeSingle();
    if (byId.data) return byId.data;
    if (byId.error) throw new Error(byId.error.message);

    const byOsLead = await supabase
      .from("custom_ops_hub_leads")
      .select("*")
      .filter("metadata->>os_lead_id", "eq", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byOsLead.data) return byOsLead.data;
    if (byOsLead.error) throw new Error(byOsLead.error.message);
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (normalizedEmail) {
    const byEmail = await supabase
      .from("custom_ops_hub_leads")
      .select("*")
      .eq("work_email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.data) return byEmail.data;
    if (byEmail.error) throw new Error(byEmail.error.message);
  }

  return null;
}

export async function loadTeardownSheetForRequest(leadId, email) {
  const supabase = createMarketingSupabaseServerClient();
  if (!supabase) {
    throw new Error("Lead lookup not configured");
  }

  const row = await fetchLeadRow(supabase, leadId, email);
  if (!row) {
    throw new Error("Lead not found for teardown generation");
  }

  return buildOpsTeardownSheet(mapLeadRowToTeardownInput(row, leadId || null));
}

export function sanitizePdfFilename(companyName) {
  const base = typeof companyName === "string" ? companyName.trim() : "company";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `studioflows-ops-teardown-${slug || "sheet"}.pdf`;
}
