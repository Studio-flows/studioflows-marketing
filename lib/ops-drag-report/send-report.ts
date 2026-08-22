import { Resend } from "resend";

import { buildOpsTeardownSheet } from "@/lib/ops-teardown/build-teardown-sheet";
import { renderTeardownPdf } from "@/lib/ops-teardown/render-teardown-pdf";
import { sanitizePdfFilename } from "@/lib/ops-teardown/load-teardown-sheet";

type OpsDragSheet = ReturnType<typeof buildOpsTeardownSheet>;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPaidOpsDragReport(input: {
  sheet: OpsDragSheet;
  toEmail: string;
  checkoutSessionId: string;
}): Promise<{ emailId: string | null; filename: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Automated report email is not configured");

  const from =
    process.env.OPS_DRAG_REPORT_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "StudioFlows <hello@studioflows.co>";
  const pdfBuffer = await renderTeardownPdf(input.sheet);
  const filename = sanitizePdfFilename(input.sheet.company_name).replace("ops-teardown", "ops-drag-report");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send(
    {
      from,
      to: input.toEmail,
      subject: `Your StudioFlows Ops Drag Report — ${input.sheet.company_name}`,
      html: `
        <div style="font-family: Georgia, serif; color: #100F0C; line-height: 1.6;">
          <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6B5212;">StudioFlows Ops Drag Report</p>
          <h1 style="font-size: 24px; margin: 12px 0 8px;">${escapeHtml(input.sheet.company_name)}</h1>
          <p style="font-size: 15px; color: #2A2620;">${escapeHtml(input.sheet.ops_drag_title)}</p>
          <p style="font-size: 15px; color: #2A2620;">${escapeHtml(input.sheet.ops_drag_summary)}</p>
          <p style="margin-top: 20px; font-size: 13px; color: #4E483D;">Your purchased PDF is attached. This automated report is operational information, not legal, tax, financial, or professional advice.</p>
        </div>
      `,
      attachments: [{ filename, content: pdfBuffer }],
    },
    { idempotencyKey: `ops-drag-report/${input.checkoutSessionId}` }
  );

  if (result.error) throw new Error(result.error.message || "Unable to send automated report");
  return { emailId: result.data?.id ?? null, filename };
}
