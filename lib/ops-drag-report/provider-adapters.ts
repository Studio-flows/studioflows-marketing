import { Resend } from "resend";
import Stripe from "stripe";

import type {
  EmailProviderAdapter,
  RefundProviderAdapter,
} from "./delivery-refund-state-machine.ts";
import {
  EmailSubmissionOutcomeUnknownError,
  RefundSubmissionOutcomeUnknownError,
} from "./delivery-refund-state-machine.ts";

export type ProviderMode = "test" | "live";

export type ResendTransport = {
  send(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    attachments: [{ filename: string; content: Buffer }];
    tags: [{ name: "order_id"; value: string }, { name: "submission_id"; value: string }];
    idempotencyKey: string;
  }): Promise<{ id: string | null; error: string | null }>;
};

export type StripeRefundTransport = {
  create(input: {
    payment_intent: string;
    amount: number;
    metadata: { order_id: string; submission_id: string; checkout_session_id: string };
  }, options: { idempotencyKey: string }): Promise<{ id: string }>;
};

export type ProviderEnvironment = {
  [key: string]: string | undefined;
  OPS_DRAG_REPORT_PROVIDER_MODE?: string;
  OPS_DRAG_REPORT_PROVIDER_TEST_ENABLED?: string;
  OPS_DRAG_REPORT_PROVIDER_LIVE_ENABLED?: string;
  OPS_DRAG_REPORT_LIVE_ENABLED?: string;
  RESEND_API_KEY?: string;
  OPS_DRAG_REPORT_EMAIL_FROM?: string;
  RESEND_FROM_EMAIL?: string;
  STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY?: string;
};

export type StripeRefundAdapterFactory = {
  forOrder(input: { orderId: string; submissionId: string }): RefundProviderAdapter;
};

export type ResendEmailAdapterConfiguration = {
  mode: ProviderMode;
  apiKey: string;
  from: string;
};

function requireNonEmpty(value: string | undefined, label: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(`${label} is not configured`);
  return normalized;
}

export function readProviderMode(environment: ProviderEnvironment): ProviderMode {
  const mode = environment.OPS_DRAG_REPORT_PROVIDER_MODE?.trim();
  if (mode !== "test" && mode !== "live") throw new Error("Provider mode must be explicitly test or live");
  if (mode === "test" && environment.OPS_DRAG_REPORT_PROVIDER_TEST_ENABLED !== "true") {
    throw new Error("Test provider execution is disabled");
  }
  if (
    mode === "live" &&
    (environment.OPS_DRAG_REPORT_PROVIDER_LIVE_ENABLED !== "true" ||
      environment.OPS_DRAG_REPORT_LIVE_ENABLED !== "true")
  ) {
    throw new Error("Live provider execution is disabled");
  }
  return mode;
}

export function createDeliveryIdempotencyKey(orderId: string, attemptNumber: number): string {
  if (!orderId.trim() || !Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 3) {
    throw new Error("Delivery idempotency input is invalid");
  }
  return `ops-drag:${orderId}:delivery:${attemptNumber}:v1`;
}

export function createResendEmailAdapter(input: {
  environment: ProviderEnvironment;
  transport: ResendTransport;
}): EmailProviderAdapter {
  const { from } = validateResendEmailAdapterConfiguration(input.environment);

  return {
    async submit(request) {
      if (!request.deliveryEmail.trim() || request.pdfBytes.byteLength === 0 || !request.filename.endsWith(".pdf")) {
        throw new Error("Attachment-only delivery input is invalid");
      }
      const idempotencyKey = createDeliveryIdempotencyKey(request.orderId, request.attemptNumber);
      let result: Awaited<ReturnType<ResendTransport["send"]>>;
      try {
        result = await input.transport.send({
          from,
          to: request.deliveryEmail,
          subject: "Your StudioFlows Ops Drag Report",
          text: "Your purchased StudioFlows Ops Drag Report is attached. No public report link was created.",
          attachments: [{ filename: request.filename, content: Buffer.from(request.pdfBytes) }],
          tags: [
            { name: "order_id", value: request.orderId },
            { name: "submission_id", value: request.submissionId },
          ],
          idempotencyKey,
        });
      } catch {
        throw new EmailSubmissionOutcomeUnknownError();
      }
      if (result.error) throw new Error(result.error);
      if (!result.id) throw new EmailSubmissionOutcomeUnknownError();
      return { providerMessageId: result.id };
    },
  };
}

export function validateResendEmailAdapterConfiguration(
  environment: ProviderEnvironment
): ResendEmailAdapterConfiguration {
  const mode = readProviderMode(environment);
  const apiKey = requireNonEmpty(environment.RESEND_API_KEY, "Resend API key");
  if (!apiKey.startsWith("re_")) throw new Error("Resend API key format is invalid");
  const from = requireNonEmpty(
    environment.OPS_DRAG_REPORT_EMAIL_FROM || environment.RESEND_FROM_EMAIL,
    "Ops Drag Report sender"
  );
  return { mode, apiKey, from };
}

export function createResendTransport(apiKey: string): ResendTransport {
  const resend = new Resend(apiKey);
  return {
    async send(input) {
      const { idempotencyKey, ...message } = input;
      const result = await resend.emails.send(message, { idempotencyKey });
      return { id: result.data?.id ?? null, error: result.error?.message ?? null };
    },
  };
}

export function validateStripeRefundAdapterConfiguration(
  environment: ProviderEnvironment
): { mode: ProviderMode; restrictedKey: string } {
  const mode = readProviderMode(environment);
  const restrictedKey = requireNonEmpty(
    environment.STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY,
    "Stripe restricted key"
  );
  if (!restrictedKey.startsWith(`rk_${mode}_`)) {
    throw new Error("Stripe refund adapter requires a mode-matched restricted key");
  }
  return { mode, restrictedKey };
}

export function createStripeRefundAdapterFactory(input: {
  environment: ProviderEnvironment;
  transport: StripeRefundTransport;
}): StripeRefundAdapterFactory {
  validateStripeRefundAdapterConfiguration(input.environment);
  return {
    forOrder(order) {
      return {
        async requestFullRefund(request) {
          if (request.currency !== "usd") throw new Error("Refund currency must be usd");
          if (
            !Number.isInteger(request.remainingRefundableAmount) ||
            request.remainingRefundableAmount < 1 ||
            request.remainingRefundableAmount > 2_900
          ) {
            throw new Error("Refund amount exceeds the remaining refundable order amount");
          }
          const expectedKey = `ops-drag:${request.checkoutSessionId}:refund:v1`;
          if (request.idempotencyKey !== expectedKey) throw new Error("Refund idempotency key mismatch");
          const refund = await input.transport.create(
            {
              payment_intent: request.paymentReferenceId,
              amount: request.remainingRefundableAmount,
              metadata: {
                order_id: order.orderId,
                submission_id: order.submissionId,
                checkout_session_id: request.checkoutSessionId,
              },
            },
            { idempotencyKey: expectedKey }
          );
          if (!refund.id) throw new RefundSubmissionOutcomeUnknownError();
          return { providerRefundId: refund.id };
        },
      };
    },
  };
}

export function createStripeRefundAdapter(input: {
  environment: ProviderEnvironment;
  transport: StripeRefundTransport;
  orderId: string;
  submissionId: string;
}): RefundProviderAdapter {
  return createStripeRefundAdapterFactory({
    environment: input.environment,
    transport: input.transport,
  }).forOrder({
    orderId: input.orderId,
    submissionId: input.submissionId,
  });
}

export function createStripeRefundTransport(restrictedKey: string): StripeRefundTransport {
  if (!restrictedKey.startsWith("rk_test_") && !restrictedKey.startsWith("rk_live_")) {
    throw new Error("Stripe refund transport rejects unrestricted keys");
  }
  const stripe = new Stripe(restrictedKey, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 2,
    telemetry: false,
  });
  return {
    async create(input, options) {
      try {
        return await stripe.refunds.create(input, options);
      } catch (error) {
        const type = error && typeof error === "object" && "type" in error
          ? String((error as { type?: unknown }).type ?? "")
          : "";
        if (type === "StripeConnectionError" || type === "StripeAPIError") {
          throw new RefundSubmissionOutcomeUnknownError();
        }
        throw error;
      }
    },
  };
}
