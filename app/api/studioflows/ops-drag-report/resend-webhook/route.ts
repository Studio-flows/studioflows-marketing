import { applyEmailProviderEvent } from "@/lib/ops-drag-report/delivery-refund-state-machine";
import { transitionOpsDragOrder } from "@/lib/ops-drag-report/order-store";
import {
  assertWebhookSize,
  mapResendWebhook,
  verifyResendWebhook,
} from "@/lib/ops-drag-report/provider-webhooks";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  try {
    assertWebhookSize(rawBody, req.headers.get("content-length"));
    const secret = process.env.RESEND_OPS_DRAG_REPORT_WEBHOOK_SECRET?.trim() ?? "";
    const payload = verifyResendWebhook({
      rawBody,
      webhookSecret: secret,
      svixId: req.headers.get("svix-id") ?? "",
      svixTimestamp: req.headers.get("svix-timestamp") ?? "",
      svixSignature: req.headers.get("svix-signature") ?? "",
    });
    const bound = mapResendWebhook(payload, req.headers.get("svix-id") ?? "");
    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Drag Report order storage is not configured");
    const order = await transitionOpsDragOrder(supabase, bound.submissionId, (current) =>
      applyEmailProviderEvent(current, bound.event, bound.recordedAt)
    );
    return Response.json({
      received: true,
      order_id: order.order_id,
      terminal_disposition: order.automation?.terminal_disposition ?? null,
      receipt: order.receipts.at(-1) ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend webhook rejected";
    const status = message.includes("too large") ? 413 : message.includes("signature") || message.includes("svix-") ? 400 : 503;
    return Response.json({ error: message }, { status });
  }
}
