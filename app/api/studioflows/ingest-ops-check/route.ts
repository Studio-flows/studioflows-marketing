import { NextRequest, NextResponse } from "next/server";

import { buildOpsAuditBookUrl } from "@/lib/ops-audit-handoff";

function pickAttribution(body: Record<string, unknown>) {
  const pqScoreRaw = body.pq_score;
  const pqScoreParsed = pqScoreRaw != null && pqScoreRaw !== "" ? Number(pqScoreRaw) : null;

  return {
    src: typeof body.src === "string" ? body.src : null,
    pq_score: Number.isFinite(pqScoreParsed) ? String(pqScoreParsed) : null,
    pq_qualified: typeof body.pq_qualified === "string" ? body.pq_qualified : null,
    pq_band: typeof body.pq_band === "string" ? body.pq_band : null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
    utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    utm_term: typeof body.utm_term === "string" ? body.utm_term : null,
    utm_content: typeof body.utm_content === "string" ? body.utm_content : null,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    landing_path: typeof body.landing_path === "string" ? body.landing_path : "/apply",
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  const pqScoreRaw = body.pq_score;
  const pqScore = typeof pqScoreRaw === "number" ? pqScoreRaw : Number(pqScoreRaw);
  if (!Number.isFinite(pqScore) || pqScore < 8) {
    return NextResponse.json({ error: "Ops Check score does not qualify for booking" }, { status: 400 });
  }

  const attribution = pickAttribution(body);
  const ingestUrl = process.env.STUDIOFLOWS_INGEST_URL?.replace(/\/$/, "");
  const tenantSlug = process.env.STUDIOFLOWS_TENANT_SLUG ?? "app";
  const token = process.env.STUDIOFLOWS_INGEST_TOKEN;
  const apikey = process.env.STUDIOFLOWS_INGEST_APIKEY ?? process.env.SUPABASE_ANON_KEY;

  if (!ingestUrl || !token || !apikey) {
    return NextResponse.json({ error: "Booking handoff not configured" }, { status: 500 });
  }

  let ingestBody: Record<string, unknown> = {};

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
        source: "studioflows.co/apply",
        landing_path: "/apply",
        consent: true,
        form_name: "homepage_ops_check",
        metadata: {
          path: "/apply",
          pq_score: pqScore,
          pq_band: typeof body.pq_band === "string" ? body.pq_band : null,
          pq_qualified: true,
          ops_check_answers: body.ops_check_answers,
          qualification_version: "ops_check_v1",
          ...attribution,
        },
      }),
    });

    ingestBody = (await ingestRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!ingestRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof ingestBody.error === "string"
              ? ingestBody.error
              : "Unable to start booking right now",
        },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Unable to start booking right now" }, { status: 502 });
  }

  const leadId = typeof ingestBody.lead_id === "string" ? ingestBody.lead_id.trim() : "";
  const bookCallUrl = buildOpsAuditBookUrl({
    leadId,
    from: "homepage-ops-check-qualified",
  });

  if (!leadId || !bookCallUrl) {
    return NextResponse.json({ error: "Unable to start booking right now" }, { status: 502 });
  }

  return NextResponse.json({
    lead_id: leadId,
    book_call_url: bookCallUrl,
  });
}
