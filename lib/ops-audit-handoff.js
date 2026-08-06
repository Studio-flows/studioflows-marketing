const OPS_HUB_PATH = "/services/custom-ops-hub";
const OPS_TEARDOWN_PATH = "/services/custom-ops-hub/teardown";
const DEFAULT_PLATFORM_ROOT = "https://os.studioflows.co";

function appendLeadParams(params, { leadId, email, from }) {
  const trimmedLeadId = typeof leadId === "string" ? leadId.trim() : "";
  if (trimmedLeadId) params.set("lead_id", trimmedLeadId);
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (trimmedEmail) params.set("email", trimmedEmail);
  const trimmedFrom = typeof from === "string" ? from.trim() : "";
  if (trimmedFrom) params.set("from", trimmedFrom);
}

function resolveSiteOrigin(siteOrigin) {
  if (siteOrigin) return siteOrigin.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  const configured =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : null;
  return (configured ?? "https://www.studioflows.co").replace(/\/$/, "");
}

export function resolvePlatformRoot() {
  if (typeof process === "undefined") return DEFAULT_PLATFORM_ROOT;
  const configured =
    process.env.STUDIOFLOWS_PLATFORM_SELL_URL ??
    process.env.STUDIOFLOWS_CONSULTING_SELL_URL ??
    DEFAULT_PLATFORM_ROOT;
  return configured.replace(/\/s\/app\/?$/, "").replace(/\/$/, "");
}

export function buildOpsAuditBookUrl({
  platformRoot = resolvePlatformRoot(),
  tenantSlug = process.env.STUDIOFLOWS_TENANT_SLUG ?? "app",
  leadId,
  email = null,
  from = "homepage-ops-check-qualified",
}) {
  const params = new URLSearchParams();
  appendLeadParams(params, { leadId, email, from });
  if (!params.has("from")) params.set("from", from);
  return `${platformRoot}/s/${tenantSlug}/ops-audit/book?${params.toString()}`;
}

/** Marketing teardown thank-you surface (Gate D expands this page). */
/** @param {{ leadId: string, email?: string | null, from?: string, siteOrigin?: string }} input */
export function buildOpsTeardownThankYouUrl({
  leadId,
  email = null,
  from = "homepage-ops-check-qualified",
  siteOrigin,
}) {
  const params = new URLSearchParams();
  appendLeadParams(params, { leadId, email, from });
  const origin = resolveSiteOrigin(siteOrigin);
  return `${origin}${OPS_TEARDOWN_PATH}?${params.toString()}`;
}

/** Legacy fork handoff — redirects client-side to teardown thank-you. */
export function buildOpsTeardownContinuationUrl({
  leadId,
  email = null,
  from = "homepage-ops-check-qualified",
  siteOrigin,
}) {
  const params = new URLSearchParams();
  appendLeadParams(params, { leadId, email, from });
  params.set("continue", "ops-teardown");
  const origin = resolveSiteOrigin(siteOrigin);
  return `${origin}${OPS_HUB_PATH}?${params.toString()}`;
}

export function buildOpsForkUrl({
  platformRoot = resolvePlatformRoot(),
  tenantSlug = process.env.STUDIOFLOWS_TENANT_SLUG ?? "app",
  leadId,
  email = null,
  from = "custom-ops-hub",
}) {
  const params = new URLSearchParams();
  appendLeadParams(params, { leadId, email, from });
  if (!params.has("from")) params.set("from", from);
  return `${platformRoot}/s/${tenantSlug}?${params.toString()}`;
}

export function isOpsTeardownContinuation(search) {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(typeof search === "string" ? search : "");
  const leadId = params.get("lead_id")?.trim() ?? "";
  return params.get("continue") === "ops-teardown" && leadId.length > 0;
}
