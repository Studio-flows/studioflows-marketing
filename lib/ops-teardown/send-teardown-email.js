import { Resend } from "resend";
import { buildOpsTeardownThankYouUrl } from "../ops-audit-handoff.js";
import { renderTeardownPdf } from "./render-teardown-pdf.js";
import { sanitizePdfFilename } from "./load-teardown-sheet.js";

function resolveFromAddress() {
  return (
    process.env.OPS_TEARDOWN_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "StudioFlows <hello@studioflows.co>"
  );
}

function buildReferralUrl(siteOrigin) {
  const origin = siteOrigin?.replace(/\/$/, "") || "https://www.studioflows.co";
  return `${origin}/#diagnosis`;
}

/**
 * @param {{
 *   sheet: import("./build-teardown-sheet.js").OpsTeardownSheet;
 *   toEmail: string;
 *   siteOrigin?: string;
 * }} input
 */
export async function sendTeardownEmail(input) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Email share is not configured");
  }

  const toEmail = input.toEmail.trim().toLowerCase();
  if (!toEmail) {
    throw new Error("Recipient email is required");
  }

  const pdfBuffer = await renderTeardownPdf(input.sheet);
  const filename = sanitizePdfFilename(input.sheet.company_name);
  const shareUrl = buildOpsTeardownThankYouUrl({
    leadId: input.sheet.lead_id,
    email: toEmail,
    from: "homepage-ops-check-qualified",
    siteOrigin: input.siteOrigin,
  });
  const referralUrl = buildReferralUrl(input.siteOrigin);

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: resolveFromAddress(),
    to: toEmail,
    subject: `Your Ops Teardown — ${input.sheet.company_name}`,
    html: `
      <div style="font-family: Georgia, serif; color: #100F0C; line-height: 1.6;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6B5212;">StudioFlows Ops Teardown</p>
        <h1 style="font-size: 24px; margin: 12px 0 8px;">${input.sheet.company_name}</h1>
        <p style="font-size: 15px; color: #2A2620;">${input.sheet.ops_drag_title}</p>
        <p style="font-size: 15px; color: #2A2620;">${input.sheet.ops_drag_summary}</p>
        <p style="margin-top: 24px;">
          <a href="${shareUrl}" style="display:inline-block;background:#0B0B0C;color:#F4F1EA;padding:12px 20px;border-radius:999px;text-decoration:none;font-size:14px;">View your teardown online</a>
        </p>
        <p style="margin-top: 20px; font-size: 14px; color: #4E483D;">
          Your PDF is attached. Know someone else with ops drag?
          <a href="${referralUrl}">Send them to the diagnosis</a>.
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  if (result.error) {
    throw new Error(result.error.message || "Unable to send teardown email");
  }

  return {
    id: result.data?.id ?? null,
    filename,
    share_url: shareUrl,
  };
}
