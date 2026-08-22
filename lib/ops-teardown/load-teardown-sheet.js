const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEAD_ROW_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "full_name",
  "work_email",
  "company_name",
  "company_website",
  "business_model",
  "company_stage",
  "primary_pain_area",
  "highest_cost_bottleneck",
  "highest_cost_bottleneck_other",
  "workflow_management",
  "frequent_breakdown",
  "frequent_breakdown_detail",
  "urgency_window",
  "quarter_risk",
  "implementation_ownership",
  "budget_range",
  "approval_involvement",
  "source_page",
  "raw_answers",
  "metadata",
].join(", ");

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export async function fetchLeadRow(supabase, leadId) {
  if (!isUuid(leadId)) return null;
  const result = await supabase
    .from("custom_ops_hub_leads")
    .select(LEAD_ROW_COLUMNS)
    .eq("id", leadId)
    .maybeSingle();
  if (result.error) throw new Error("Unable to load Ops Check record");
  return result.data ?? null;
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
