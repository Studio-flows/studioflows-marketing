import {
  admitGeneratedReport,
  claimDeliverySubmissionAttempt,
  expireDeliverySla,
  readPersistedReportArtifact,
  recordDeliverySubmissionFailure,
  recordGenerationFailure,
  startDeliveryAttempt,
  startGenerationAttempt,
  type EmailProviderAdapter,
  type ReportGenerationAdapter,
} from "./delivery-refund-state-machine.ts";
import type { OpsDragOrder } from "./order-foundation.ts";

export type PaidFulfillmentOrderStore = {
  load(): Promise<OpsDragOrder>;
  transition(apply: (order: OpsDragOrder) => OpsDragOrder): Promise<OpsDragOrder>;
};

export type PaidFulfillmentDisposition =
  | "DELIVERY_SUBMITTED"
  | "GENERATION_RETRYABLE"
  | "GENERATION_FAILED"
  | "DELIVERY_RETRYABLE"
  | "DELIVERY_FAILED"
  | "ALREADY_SUBMITTED"
  | "REFUND_PATH_HELD"
  | "TERMINAL_NOOP";

function generationStatus(order: OpsDragOrder): string {
  return order.automation?.generation.status ?? "PENDING";
}

function deliveryStatus(order: OpsDragOrder): string {
  return order.automation?.delivery.status ?? "PENDING";
}

function refundStatus(order: OpsDragOrder): string {
  return order.automation?.refund.status ?? "NOT_REQUIRED";
}

function requireOwnedPaidOrder(order: OpsDragOrder): void {
  if (!order.payment || !order.fulfillment.lease_owner) {
    throw new Error("Paid fulfillment orchestration requires an admitted payment and fulfillment owner");
  }
  if (order.payment.snapshotDigest !== order.snapshot.digest) {
    throw new Error("Paid fulfillment orchestration snapshot binding mismatch");
  }
}

function refundEligibleAt(order: OpsDragOrder): string {
  if (order.automation) return order.automation.sla.refund_eligible_at;
  return new Date(Date.parse(order.payment!.paidAt) + 45 * 60_000).toISOString();
}

export async function orchestratePaidOpsDragFulfillment(input: {
  store: PaidFulfillmentOrderStore;
  generationAdapter: ReportGenerationAdapter;
  emailAdapter: EmailProviderAdapter;
  recordedAt: string;
}): Promise<{ disposition: PaidFulfillmentDisposition; order: OpsDragOrder }> {
  let order = await input.store.load();
  requireOwnedPaidOrder(order);
  if (order.automation?.terminal_disposition) return { disposition: "TERMINAL_NOOP", order };
  if (refundStatus(order) !== "NOT_REQUIRED") return { disposition: "REFUND_PATH_HELD", order };
  if (Date.parse(input.recordedAt) >= Date.parse(refundEligibleAt(order))) {
    order = await input.store.transition((current) =>
      refundStatus(current) === "NOT_REQUIRED" ? expireDeliverySla(current, input.recordedAt) : current
    );
    if (refundStatus(order) !== "NOT_REQUIRED") return { disposition: "REFUND_PATH_HELD", order };
  }

  if (generationStatus(order) === "PENDING" || generationStatus(order) === "RETRYABLE") {
    order = await input.store.transition((current) => {
      requireOwnedPaidOrder(current);
      if (current.automation?.terminal_disposition || refundStatus(current) !== "NOT_REQUIRED") return current;
      const status = generationStatus(current);
      return status === "PENDING" || status === "RETRYABLE"
        ? startGenerationAttempt(current, input.recordedAt)
        : current;
    });
  }

  if (generationStatus(order) === "IN_PROGRESS") {
    const attemptNumber = order.automation!.generation.attempts;
    try {
      const generated = await input.generationAdapter.generate({
        orderId: order.order_id,
        submissionId: order.submission_id,
        snapshotDigest: order.snapshot.digest,
        snapshot: order.snapshot,
        generatedAt: order.payment!.paidAt,
        templateVersion: order.automation!.template_version,
      });
      order = await input.store.transition((current) => {
        if (current.automation?.terminal_disposition || refundStatus(current) !== "NOT_REQUIRED") return current;
        if (generationStatus(current) === "VALIDATED") return current;
        if (
          generationStatus(current) !== "IN_PROGRESS" ||
          current.automation?.generation.attempts !== attemptNumber
        ) return current;
        return admitGeneratedReport(current, generated.report, generated.pdfBytes, input.recordedAt);
      });
    } catch {
      order = await input.store.transition((current) => {
        if (
          current.automation?.generation.status !== "IN_PROGRESS" ||
          current.automation.generation.attempts !== attemptNumber
        ) return current;
        return recordGenerationFailure(current, "REPORT_GENERATION_OR_VALIDATION_FAILED", input.recordedAt);
      });
      return {
        disposition: order.automation?.generation.status === "FAILED" ? "GENERATION_FAILED" : "GENERATION_RETRYABLE",
        order,
      };
    }
  }

  order = await input.store.load();
  requireOwnedPaidOrder(order);
  if (order.automation?.terminal_disposition) return { disposition: "TERMINAL_NOOP", order };
  if (refundStatus(order) !== "NOT_REQUIRED") return { disposition: "REFUND_PATH_HELD", order };
  if (["SUBMITTED", "ACCEPTED", "QUEUED", "SENT", "DELIVERED"].includes(deliveryStatus(order))) {
    return { disposition: "ALREADY_SUBMITTED", order };
  }

  const artifact = readPersistedReportArtifact(order);
  order = await input.store.transition((current) => {
    if (current.automation?.terminal_disposition || refundStatus(current) !== "NOT_REQUIRED") return current;
    if (["SUBMITTED", "ACCEPTED", "QUEUED", "SENT", "DELIVERED"].includes(deliveryStatus(current))) {
      return current;
    }
    return claimDeliverySubmissionAttempt(current, input.recordedAt).order;
  });
  if (order.automation?.terminal_disposition) return { disposition: "TERMINAL_NOOP", order };
  if (refundStatus(order) !== "NOT_REQUIRED") return { disposition: "REFUND_PATH_HELD", order };
  if (["SUBMITTED", "ACCEPTED", "QUEUED", "SENT", "DELIVERED"].includes(deliveryStatus(order))) {
    return { disposition: "ALREADY_SUBMITTED", order };
  }
  if (deliveryStatus(order) !== "SUBMITTING") throw new Error("Delivery submission lease was not acquired");
  const attemptNumber = order.automation!.delivery.attempts;
  const expectedIdempotencyKey = `ops-drag:${order.order_id}:delivery:${attemptNumber}:v1`;
  if (order.automation!.delivery.submission_idempotency_key !== expectedIdempotencyKey) {
    throw new Error("Delivery submission idempotency binding mismatch");
  }
  let providerMessageId: string;
  try {
    const result = await input.emailAdapter.submit({
      orderId: order.order_id,
      submissionId: order.submission_id,
      deliveryEmail: order.snapshot.delivery_email,
      reportSha256: artifact.reportSha256,
      pdfSha256: artifact.pdfSha256,
      pdfBytes: artifact.pdfBytes,
      filename: artifact.filename,
      attemptNumber,
    });
    providerMessageId = result.providerMessageId;
  } catch {
    order = await input.store.transition((current) =>
      recordDeliverySubmissionFailure(
        current,
        attemptNumber,
        "EMAIL_PROVIDER_SUBMISSION_FAILED",
        input.recordedAt
      )
    );
    return {
      disposition: order.automation?.delivery.status === "FAILED" ? "DELIVERY_FAILED" : "DELIVERY_RETRYABLE",
      order,
    };
  }

  order = await input.store.transition((current) => {
    if (current.automation?.terminal_disposition || refundStatus(current) !== "NOT_REQUIRED") return current;
    if (
      current.automation?.delivery.status === "SUBMITTED" &&
      current.automation.delivery.provider_message_id === providerMessageId
    ) return current;
    if (
      deliveryStatus(current) !== "PENDING" &&
      deliveryStatus(current) !== "RETRYABLE" &&
      deliveryStatus(current) !== "SUBMITTING"
    ) throw new Error("Concurrent delivery submission changed provider binding");
    if (
      deliveryStatus(current) === "SUBMITTING" &&
      current.automation?.delivery.attempts !== attemptNumber
    ) {
      throw new Error("Concurrent delivery submission changed attempt binding");
    }
    return startDeliveryAttempt(current, providerMessageId, input.recordedAt);
  });
  if (refundStatus(order) !== "NOT_REQUIRED") return { disposition: "REFUND_PATH_HELD", order };
  return { disposition: "DELIVERY_SUBMITTED", order };
}
