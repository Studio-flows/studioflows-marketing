import { createDeterministicReportGenerationAdapter } from "@/lib/ops-drag-report/deterministic-report";
import { processPaidFulfillmentWorkerOrder } from "@/lib/ops-drag-report/paid-fulfillment-worker";
import {
  loadOpsDragOrder,
  listOpsDragOrdersForWorker,
  transitionOpsDragOrder,
} from "@/lib/ops-drag-report/order-store";
import {
  createResendTransport,
  createStripeRefundTransport,
} from "@/lib/ops-drag-report/provider-adapters";
import {
  assertSchedulerRequest,
  preflightResendDeliveryWorker,
  preflightStripeRefundWorker,
  runBoundedProviderWorker,
} from "@/lib/ops-drag-report/provider-worker";
import { createMarketingSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    assertSchedulerRequest({
      authorization: req.headers.get("authorization"),
      expectedSecret: process.env.OPS_DRAG_REPORT_WORKER_SECRET,
      enabled: process.env.OPS_DRAG_REPORT_PROVIDER_WORKER_ENABLED,
    });
    const generationAdapter = createDeterministicReportGenerationAdapter();
    const supabase = createMarketingSupabaseServerClient();
    if (!supabase) throw new Error("Ops Drag Report order storage is not configured");
    const now = new Date().toISOString();
    const result = await runBoundedProviderWorker({
      loadBatch: (limit) => listOpsDragOrdersForWorker(supabase, limit, now),
      process(observed) {
        const store = {
          load: () => loadOpsDragOrder(supabase, observed.submission_id),
          transition: (apply: Parameters<typeof transitionOpsDragOrder>[2]) =>
            transitionOpsDragOrder(supabase, observed.submission_id, apply),
        };
        return processPaidFulfillmentWorkerOrder({
          store,
          generationAdapter,
          createEmailAdapter: () => preflightResendDeliveryWorker({
            environment: process.env,
            createTransport: createResendTransport,
          }),
          createRefundAdapter: (order) => preflightStripeRefundWorker({
            environment: process.env,
            createTransport: createStripeRefundTransport,
          }).forOrder({ orderId: order.order_id, submissionId: order.submission_id }),
          recordedAt: now,
        });
      },
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider worker rejected";
    const status = message.includes("authorization") ? 401 : message.includes("disabled") ? 423 : 503;
    return Response.json({ error: message }, { status });
  }
}
