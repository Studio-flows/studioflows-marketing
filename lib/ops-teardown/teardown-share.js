import { buildOpsTeardownThankYouUrl } from "../ops-audit-handoff.js";

export function buildTeardownPdfDownloadUrl({ leadId, email, siteOrigin }) {
  const params = new URLSearchParams();
  if (leadId) params.set("lead_id", leadId);
  if (email) params.set("email", email);
  const origin =
    siteOrigin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.studioflows.co");
  return `${origin}/api/studioflows/ops-teardown/pdf?${params.toString()}`;
}

export function buildTeardownShareUrl({ leadId, email, from, siteOrigin }) {
  return buildOpsTeardownThankYouUrl({ leadId, email, from, siteOrigin });
}

export function buildTeardownReferralUrl(siteOrigin) {
  const origin =
    siteOrigin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.studioflows.co");
  return `${origin}/#diagnosis`;
}

export function buildTeardownReferralMailto({ companyName, siteOrigin }) {
  const referralUrl = buildTeardownReferralUrl(siteOrigin);
  const subject = encodeURIComponent("Quick ops drag diagnosis");
  const body = encodeURIComponent(
    `I just got an Ops Teardown from StudioFlows${companyName ? ` for ${companyName}` : ""}. If your team has ops drag, this 6-question diagnosis is worth running:\n\n${referralUrl}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}
