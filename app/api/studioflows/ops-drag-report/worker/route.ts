import {
  applyRefundProviderEvent,
  expireDeliverySla,
  recordRefundRequestFailure,
} from "@/lib/ops-drag-report/delivery-refund-state-machine";
import {
  claimOpsDragRefund,
  listOpsDragOrdersForWorker,
  transitionOpsDragOrder,
} from "@/lib/ops-drag-report/order-store";
import {
  createStripeRefundTransport,
} from "@/lib/ops-drag-report/provider-adapters";
import {
  assertSchedulerRequest,
  preflightStripeRefundWorker,
  runBoundedProviderWorker,
} from "@/lib/ops-drag-report/provider-worker";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function dueForSlaExpiry(refundEligibleAt: string, now: string): boolean {
  return Date.parse(now) >= Date.parse(refundEligibleAt);
}

export async function GET(req: Request) {
  try {
    assertSchedulerRequest({
      authorization: req.headers.get("authorization"),
      expectedSecret: process.env.OPS_DRAG_REPORT_WORKER_SECRET,
      enabled: process.env.OPS_DRAG_REPORT_PROVIDER_WORKER_ENABLED,
    });
    const refundAdapterFactory = preflightStripeRefundWorker({
      environment: process.env,
      createTransport: createStripeRefundTransport,
    });
    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Drag Report order storage is not configured");
    const now = new Date().toISOString();
    const result = await runBoundedProviderWorker({
      loadBatch: (limit) => listOpsDragOrdersForWorker(supabase, limit),
      async process(observed) {
        if (!observed.payment || !observed.automation || observed.automation.terminal_disposition) return "noop";
        let order = observed;
        if (
          order.automation.refund.status === "NOT_REQUIRED" &&
          dueForSlaExpiry(order.automation.sla.refund_eligible_at, now)
        ) {
          order = await transitionOpsDragOrder(supabase, order.submission_id, (current) =>
            expireDeliverySla(current, now)
          );
        }
        if (order.automation?.refund.status !== "REQUIRED" && order.automation?.refund.status !== "RETRYABLE") {
          return "noop";
        }
        const ownership = await claimOpsDragRefund(supabase, order.submission_id, now);
        if (ownership.disposition !== "acquired") return "noop";
        let response: { providerRefundId: string };
        try {
          const adapter = refundAdapterFactory.forOrder({
            orderId: ownership.order.order_id,
            submissionId: ownership.order.submission_id,
          });
          response = await adapter.requestFullRefund({
            checkoutSessionId: ownership.order.payment!.checkoutSessionId,
            paymentReferenceId: ownership.order.payment!.paymentReferenceId,
            remainingRefundableAmount: ownership.order.payment!.amountTotal,
            currency: "usd",
            idempotencyKey: ownership.idempotencyKey,
          });
        } catch {
          await transitionOpsDragOrder(supabase, ownership.order.submission_id, (current) =>
            recordRefundRequestFailure(current, "REFUND_PROVIDER_REQUEST_FAILED", now)
          );
          return "blocked";
        }
        await transitionOpsDragOrder(supabase, ownership.order.submission_id, (current) =>
          applyRefundProviderEvent(current, {
            eventId: `refund_create_response:${response.providerRefundId}`,
            providerRefundId: response.providerRefundId,
            type: "refund.created",
          }, now)
        );
        return "processed";
      },
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider worker rejected";
    const status = message.includes("authorization") ? 401 : message.includes("disabled") ? 423 : 503;
    return Response.json({ error: message }, { status });
  }
}
