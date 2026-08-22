import {
  createResendEmailAdapter,
  createStripeRefundAdapterFactory,
  validateResendEmailAdapterConfiguration,
  validateStripeRefundAdapterConfiguration,
  type ResendTransport,
  type ProviderEnvironment,
  type StripeRefundAdapterFactory,
  type StripeRefundTransport,
} from "./provider-adapters.ts";
import type { EmailProviderAdapter } from "./delivery-refund-state-machine.ts";

export const OPS_DRAG_WORKER_MAX_BATCH = 10;

export function preflightResendDeliveryWorker(input: {
  environment: ProviderEnvironment;
  createTransport(apiKey: string): ResendTransport;
}): EmailProviderAdapter {
  const configuration = validateResendEmailAdapterConfiguration(input.environment);
  const transport = input.createTransport(configuration.apiKey);
  return createResendEmailAdapter({ environment: input.environment, transport });
}

export function preflightStripeRefundWorker(input: {
  environment: ProviderEnvironment;
  createTransport(restrictedKey: string): StripeRefundTransport;
}): StripeRefundAdapterFactory {
  const configuration = validateStripeRefundAdapterConfiguration(input.environment);
  const transport = input.createTransport(configuration.restrictedKey);
  return createStripeRefundAdapterFactory({ environment: input.environment, transport });
}

export function assertSchedulerRequest(input: {
  authorization: string | null;
  expectedSecret: string | undefined;
  enabled: string | undefined;
}): void {
  if (input.enabled !== "true") throw new Error("Ops Drag Report provider worker is disabled");
  const secret = input.expectedSecret?.trim() ?? "";
  if (secret.length < 32) throw new Error("Ops Drag Report worker secret is not configured");
  if (input.authorization !== `Bearer ${secret}`) throw new Error("Ops Drag Report scheduler authorization failed");
}

export async function runBoundedProviderWorker<T>(input: {
  loadBatch(limit: number): Promise<T[]>;
  process(item: T): Promise<"processed" | "noop" | "blocked">;
  limit?: number;
}): Promise<{ scanned: number; processed: number; noop: number; blocked: number }> {
  const limit = input.limit ?? OPS_DRAG_WORKER_MAX_BATCH;
  if (!Number.isInteger(limit) || limit < 1 || limit > OPS_DRAG_WORKER_MAX_BATCH) {
    throw new Error("Worker batch limit must be between 1 and 10");
  }
  const items = (await input.loadBatch(limit)).slice(0, limit);
  const result = { scanned: items.length, processed: 0, noop: 0, blocked: 0 };
  for (const item of items) {
    const disposition = await input.process(item);
    result[disposition] += 1;
  }
  return result;
}
