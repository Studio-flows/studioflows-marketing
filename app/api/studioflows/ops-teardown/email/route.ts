import { loadTeardownSheetForRequest } from "@/lib/ops-teardown/load-teardown-sheet";
import { sendTeardownEmail } from "@/lib/ops-teardown/send-teardown-email";

export const runtime = "nodejs";

export async function POST(req) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const leadId = typeof body?.lead_id === "string" ? body.lead_id.trim() : "";
  const lookupEmail = typeof body?.email === "string" ? body.email.trim() : "";
  const toEmail =
    typeof body?.to_email === "string" && body.to_email.trim()
      ? body.to_email.trim()
      : lookupEmail;

  if (!leadId && !lookupEmail) {
    return Response.json({ error: "lead_id or email is required" }, { status: 400 });
  }
  if (!toEmail) {
    return Response.json({ error: "to_email is required" }, { status: 400 });
  }

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.studioflows.co";

  try {
    const sheet = await loadTeardownSheetForRequest(leadId, lookupEmail);
    const result = await sendTeardownEmail({
      sheet,
      toEmail,
      siteOrigin,
    });

    return Response.json({
      ok: true,
      email_id: result.id,
      filename: result.filename,
      share_url: result.share_url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to email teardown PDF";
    const status = message.includes("not configured")
      ? 503
      : message.includes("not found")
        ? 404
        : 500;
    return Response.json({ error: message }, { status });
  }
}
