import {
  opsTeardownErrorResponse,
  sendAuthorizedOpsTeardownEmail,
} from "@/lib/ops-teardown/authorized-access";

export const runtime = "nodejs";

export async function POST(req) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.studioflows.co";

  try {
    const result = await sendAuthorizedOpsTeardownEmail({
      authorization: req.headers.get("authorization"),
      body,
      siteOrigin,
    });

    return Response.json({
      ok: true,
      email_id: result.id,
      filename: result.filename,
    });
  } catch (error) {
    return opsTeardownErrorResponse(error);
  }
}
