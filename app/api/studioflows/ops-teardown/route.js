import { loadTeardownSheetForRequest } from "@/lib/ops-teardown/load-teardown-sheet";

export async function GET(req) {
  const leadId = req.nextUrl.searchParams.get("lead_id")?.trim() ?? "";
  const email = req.nextUrl.searchParams.get("email")?.trim() ?? "";

  if (!leadId && !email) {
    return Response.json({ error: "lead_id or email is required" }, { status: 400 });
  }

  try {
    const sheet = await loadTeardownSheetForRequest(leadId, email);
    return Response.json({ sheet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build teardown sheet";
    const status = message.includes("not configured")
      ? 500
      : message.includes("not found")
        ? 404
        : 500;
    return Response.json({ error: message }, { status });
  }
}
