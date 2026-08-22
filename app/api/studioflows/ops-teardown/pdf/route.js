import {
  loadAuthorizedOpsTeardown,
  opsTeardownErrorResponse,
} from "@/lib/ops-teardown/authorized-access";
import {
  sanitizePdfFilename,
} from "@/lib/ops-teardown/load-teardown-sheet";
import { renderTeardownPdf } from "@/lib/ops-teardown/render-teardown-pdf";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { sheet } = await loadAuthorizedOpsTeardown({
      authorization: req.headers.get("authorization"),
      purpose: "pdf",
    });
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
    return opsTeardownErrorResponse(error);
  }
}
