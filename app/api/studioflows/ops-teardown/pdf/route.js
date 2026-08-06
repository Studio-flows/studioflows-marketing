import {
  loadTeardownSheetForRequest,
  sanitizePdfFilename,
} from "@/lib/ops-teardown/load-teardown-sheet";
import { renderTeardownPdf } from "@/lib/ops-teardown/render-teardown-pdf";

export const runtime = "nodejs";

export async function GET(req) {
  const leadId = req.nextUrl.searchParams.get("lead_id")?.trim() ?? "";
  const email = req.nextUrl.searchParams.get("email")?.trim() ?? "";

  if (!leadId && !email) {
    return Response.json({ error: "lead_id or email is required" }, { status: 400 });
  }

  try {
    const sheet = await loadTeardownSheetForRequest(leadId, email);
    const pdfBuffer = await renderTeardownPdf(sheet);
    const filename = sanitizePdfFilename(sheet.company_name);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render teardown PDF";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
