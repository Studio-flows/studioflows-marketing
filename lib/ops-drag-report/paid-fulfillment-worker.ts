import {
  applyRefundProviderEvent,
  claimRefundAttempt,
  expireDeliverySla,
  RefundSubmissionOutcomeUnknownError,
  recordRefundRequestFailure,
  recordRefundSubmissionOutcomeUnknown,
  type EmailProviderAdapter,
  type RefundProviderAdapter,
  type ReportGenerationAdapter,
} from "./delivery-refund-state-machine.ts";
import {
  orchestratePaidOpsDragFulfillment,
  type PaidFulfillmentOrderStore,
} from "./paid-fulfillment-orchestrator.ts";

export type PaidFulfillmentWorkerDisposition = "processed" | "noop" | "blocked";

function refundStatus(order: Awaited<ReturnType<PaidFulfillmentOrderStore["load"]>>): string {
  return order.automation?.refund.status ?? "NOT_REQUIRED";
}

function dueForSlaExpiry(refundEligibleAt: string, now: string): boolean {
  return Date.parse(now) >= Date.parse(refundEligibleAt);
}

export async function processPaidFulfillmentWorkerOrder(input: {
  store: PaidFulfillmentOrderStore;
  generationAdapter: ReportGenerationAdapter;
  createEmailAdapter(): EmailProviderAdapter;
  createRefundAdapter(order: Awaited<ReturnType<PaidFulfillmentOrderStore["load"]>>): RefundProviderAdapter;
  recordedAt: string;
}): Promise<PaidFulfillmentWorkerDisposition> {
  let order = await input.store.load();
  if (!order.payment || order.automation?.terminal_disposition) return "noop";

  const refundEligibleAt = order.automation?.sla.refund_eligible_at ??
    new Date(Date.parse(order.payment.paidAt) + 45 * 60_000).toISOString();
  if (refundStatus(order) === "NOT_REQUIRED" && dueForSlaExpiry(refundEligibleAt, input.recordedAt)) {
    order = await input.store.transition((current) => expireDeliverySla(current, input.recordedAt));
  }

  if (refundStatus(order) === "CREATED" || refundStatus(order) === "SUCCEEDED") return "noop";

  if (
    refundStatus(order) !== "REQUIRED" &&
    refundStatus(order) !== "RETRYABLE" &&
    refundStatus(order) !== "OWNED"
  ) {
    const orchestration = await orchestratePaidOpsDragFulfillment({
      store: input.store,
      generationAdapter: input.generationAdapter,
      createEmailAdapter: input.createEmailAdapter,
      recordedAt: input.recordedAt,
    });
    return orchestration.disposition === "DELIVERY_SUBMITTED" ? "processed" :
      orchestration.disposition === "ALREADY_SUBMITTED" || orchestration.disposition === "TERMINAL_NOOP"
        ? "noop"
        : "blocked";
  }

  let ownership = claimRefundAttempt(order, input.recordedAt);
  if (refundStatus(order) !== "OWNED") {
    order = await input.store.transition((current) => {
      const currentOwnership = claimRefundAttempt(current, input.recordedAt);
      ownership = currentOwnership;
      return currentOwnership.order;
    });
  }
  if (refundStatus(order) !== "OWNED") return "noop";
  if (
    order.automation!.refund.request_outcome_unknown_count >=
    order.automation!.refund.max_request_outcome_unknown_count
  ) return "blocked";

  let refundAdapter: RefundProviderAdapter;
  try {
    refundAdapter = input.createRefundAdapter(order);
  } catch {
    await input.store.transition((current) =>
      recordRefundRequestFailure(current, "REFUND_PROVIDER_CONFIGURATION_FAILED", input.recordedAt)
    );
    return "blocked";
  }

  let response: { providerRefundId: string };
  try {
    response = await refundAdapter.requestFullRefund({
      checkoutSessionId: order.payment!.checkoutSessionId,
      paymentReferenceId: order.payment!.paymentReferenceId,
      remainingRefundableAmount: order.payment!.amountTotal,
      currency: "usd",
      idempotencyKey: ownership.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof RefundSubmissionOutcomeUnknownError) {
      await input.store.transition((current) =>
        recordRefundSubmissionOutcomeUnknown(current, input.recordedAt)
      );
      return "blocked";
    }
    await input.store.transition((current) =>
      recordRefundRequestFailure(current, "REFUND_PROVIDER_REQUEST_FAILED", input.recordedAt)
    );
    return "blocked";
  }

  await input.store.transition((current) =>
    applyRefundProviderEvent(current, {
      eventId: `refund_create_response:${response.providerRefundId}`,
      providerRefundId: response.providerRefundId,
      type: "refund.created",
    }, input.recordedAt)
  );
  return "processed";
}
