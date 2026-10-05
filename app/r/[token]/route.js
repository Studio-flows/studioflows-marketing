import { NextResponse } from "next/server";

import {
  buildAttributedDestination,
  classifyOutreachRequest,
  hashUserAgent,
  verifyOutreachToken,
} from "@/lib/outreach-link.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_FALLBACK = "https://www.studioflows.co/real-estate-media?sf_link_error=invalid";

function ingestConfig() {
  const baseUrl = process.env.STUDIOFLOWS_INGEST_URL?.replace(/\/$/, "");
  const token = process.env.STUDIOFLOWS_INGEST_TOKEN;
  const apikey = process.env.STUDIOFLOWS_INGEST_APIKEY || process.env.SUPABASE_ANON_KEY;
  const tenantSlug = process.env.STUDIOFLOWS_TENANT_SLUG || "app";

  if (!baseUrl || !token || !apikey) return null;
  return { baseUrl, token, apikey, tenantSlug };
}

async function recordClick({ request, payload, destination, classification }) {
  const config = ingestConfig();
  if (!config) {
    console.error("Outreach click ingest is not configured");
    return;
  }

  const userAgent = request.headers.get("user-agent") || "";
  const response = await fetch(`${config.baseUrl}/consulting-ingest-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apikey,
      "x-studioflows-tenant-slug": config.tenantSlug,
      "x-studioflows-ingest-token": config.token,
    },
    body: JSON.stringify({
      session_id: payload.correlation_id,
      event_type: "cta_click",
      path: "/r/:token",
      properties: {
        event_name: "email_link_click",
        channel: "email",
        message_id: payload.message_id,
        prospect_id: payload.prospect_id,
        campaign_id: payload.campaign_id,
        experiment_id: payload.experiment_id,
        variant_id: payload.variant_id,
        correlation_id: payload.correlation_id,
        market_cell: payload.market_cell,
        vertical: payload.vertical,
        destination: destination.toString(),
        request_method: request.method,
        user_agent_hash: hashUserAgent(userAgent),
        is_bot: classification.is_bot,
        bot_reason: classification.reason,
        is_human_click: !classification.is_bot,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Outreach click ingest failed with ${response.status}: ${body.slice(0, 200)}`);
  }
}

async function handle(request, context) {
  const token = context?.params?.token;
  const secret = process.env.SF_OUTREACH_LINK_SECRET;

  let payload;
  let destination;
  try {
    payload = verifyOutreachToken(token, secret);
    destination = buildAttributedDestination(
      payload,
      process.env.SF_OUTREACH_ALLOWED_ORIGINS
    );
  } catch (error) {
    console.error("Invalid outreach link", error instanceof Error ? error.message : "unknown");
    const response = NextResponse.redirect(SAFE_FALLBACK, 302);
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const classification = classifyOutreachRequest(
    request.headers.get("user-agent"),
    request.method
  );

  try {
    await recordClick({ request, payload, destination, classification });
  } catch (error) {
    // Fail open for the recipient: tracking failure must never block the destination.
    console.error("Unable to record outreach click", error instanceof Error ? error.message : "unknown");
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request, context) {
  return handle(request, context);
}

export async function HEAD(request, context) {
  return handle(request, context);
}
