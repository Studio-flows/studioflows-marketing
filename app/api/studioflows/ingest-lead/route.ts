import { NextRequest, NextResponse } from "next/server";

import {
  buildDisqualifiedLeadRow,
  buildQualifiedLeadRow,
  evaluateQualification,
  getMarketingBucket,
  getOutreachNextSteps,
  splitName,
  tierFromBudget,
} from "@/lib/qualify-custom-ops-hub";
import { resolveBookCallUrl } from "@/lib/lead-attribution";
import { buildOpsTeardownThankYouUrl } from "@/lib/ops-audit-handoff";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

function pickAttribution(body: Record<string, unknown>) {
  const pqScore =
    typeof body.pq_score === "string" || typeof body.pq_score === "number"
      ? String(body.pq_score)
      : null;

  return {
    src: typeof body.src === "string" ? body.src : null,
    pq_session_id: typeof body.pq_session_id === "string" ? body.pq_session_id : null,
    pq_score: pqScore,
    pq_qualified: typeof body.pq_qualified === "string" ? body.pq_qualified : null,
    pq_band: typeof body.pq_band === "string" ? body.pq_band : null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
    utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    utm_term: typeof body.utm_term === "string" ? body.utm_term : null,
    utm_content: typeof body.utm_content === "string" ? body.utm_content : null,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    landing_path: typeof body.landing_path === "string" ? body.landing_path : "/services/custom-ops-hub",
  };
}

function pickPreQual(body: Record<string, unknown>) {
  const preQual = body.pre_qual;
  if (!preQual || typeof preQual !== "object" || Array.isArray(preQual)) {
    return null;
  }
  const sessionId =
    typeof (preQual as Record<string, unknown>).session_id === "string"
      ? ((preQual as Record<string, unknown>).session_id as string).trim()
      : "";
  return sessionId ? (preQual as Record<string, unknown>) : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  const raw = (body.form_payload ?? body) as Record<string, unknown>;
  const { score, reasons, qualified } = evaluateQualification(raw);
  const tier = tierFromBudget(raw.budgetRange);
  const attribution = pickAttribution(body);
  const preQual = pickPreQual(body);
  const handoffFrom =
    typeof body.from === "string" && body.from.trim() ? body.from.trim() : "custom-ops-hub";

  if (!qualified) {
    const marketingBucket = getMarketingBucket({ score, reasons });
    const outreachNextSteps = getOutreachNextSteps(marketingBucket);
    const supabase = createMarketingSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: "Lead storage not configured" }, { status: 500 });
    }

    const row = buildDisqualifiedLeadRow(raw, { score, reasons, qualified }, marketingBucket, outreachNextSteps);
    row.metadata = {
      ...row.metadata,
      ...attribution,
      ...(preQual ? { pre_qual: preQual } : {}),
    };

    const { error } = await supabase.from("custom_ops_hub_leads").insert([row]);
    if (error) {
      return NextResponse.json({ error: error.message || "Unable to save lead" }, { status: 500 });
    }

    return NextResponse.json({
      qualified: false,
      score,
      reasons,
      marketing_bucket: marketingBucket,
      outreach_next_steps: outreachNextSteps,
      recommended_tier: tier,
    });
  }

  const supabase = createMarketingSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Lead storage not configured" }, { status: 500 });
  }

  const supabaseLeadId = crypto.randomUUID();
  const qualifiedBase = buildQualifiedLeadRow(raw, { score, reasons, qualified }, tier);
  const qualifiedRow = {
    ...qualifiedBase,
    id: supabaseLeadId,
    metadata: {
      ...qualifiedBase.metadata,
      ...attribution,
      ...(preQual ? { pre_qual: preQual } : {}),
    },
  };

  const { error: insertError } = await supabase.from("custom_ops_hub_leads").insert([qualifiedRow]);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Unable to save lead" },
      { status: 500 }
    );
  }

  const { first_name, last_name } = splitName(raw.fullName);
  const email = typeof raw.workEmail === "string" ? raw.workEmail.trim().toLowerCase() : null;

  const ingestUrl = process.env.STUDIOFLOWS_INGEST_URL?.replace(/\/$/, "");
  const tenantSlug = process.env.STUDIOFLOWS_TENANT_SLUG ?? "app";
  const token = process.env.STUDIOFLOWS_INGEST_TOKEN;
  const apikey = process.env.STUDIOFLOWS_INGEST_APIKEY ?? process.env.SUPABASE_ANON_KEY;

  let osLeadId: string | undefined;
  let ingestBody: Record<string, unknown> = {};
  if (ingestUrl && token && apikey) {
    try {
      const ingestRes = await fetch(`${ingestUrl}/consulting-ingest-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey,
          "x-studioflows-tenant-slug": tenantSlug,
          "x-studioflows-ingest-token": token,
        },
        body: JSON.stringify({
          email,
          first_name,
          last_name,
          source: "studioflows.co/custom-ops-hub",
          landing_path: attribution.landing_path,
          consent: true,
          form_name: "custom_ops_hub_qualifier",
          form_payload: raw,
          metadata: {
            path: "/services/custom-ops-hub",
            qualification_score: score,
            qualification_reasons: reasons,
            qualification_version: "v1",
            recommended_tier: tier,
            supabase_lead_id: supabaseLeadId,
            full_qualifier_complete: true,
            full_qualifier_payload: raw,
            ...attribution,
            ...(preQual ? { pre_qual: preQual } : {}),
          },
        }),
      });

      ingestBody = (await ingestRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (ingestRes.ok) {
        osLeadId = ingestBody.lead_id as string | undefined;
      }
    } catch {
      // Swallow: the lead is safely stored in Supabase; OS forward is optional.
    }
  }

  if (osLeadId && osLeadId !== supabaseLeadId) {
    const metadataWithOsLead = {
      ...(qualifiedRow.metadata as Record<string, unknown>),
      os_lead_id: osLeadId,
    };
    await supabase
      .from("custom_ops_hub_leads")
      .update({ metadata: metadataWithOsLead })
      .eq("id", supabaseLeadId);
  }

  const leadId = osLeadId ?? supabaseLeadId;
  const bookFrom = attribution.src === "homepage-diagnosis" ? "homepage-diagnosis" : handoffFrom;
  const bookCallUrl = resolveBookCallUrl({
    ingestBookCallUrl: typeof ingestBody.book_call_url === "string" ? ingestBody.book_call_url : null,
    leadId,
    email,
    from: bookFrom,
  });
  const opsTeardownUrl = buildOpsTeardownThankYouUrl({
    leadId,
    email,
    from: handoffFrom,
    siteOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.studioflows.co",
  });
  return NextResponse.json({
    qualified: true,
    score,
    reasons,
    lead_id: leadId,
    book_call_url: bookCallUrl,
    ops_teardown_url: opsTeardownUrl,
    redirect_url: bookCallUrl,
    recommended_tier: tier,
  });
}
