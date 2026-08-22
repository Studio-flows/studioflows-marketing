import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-07-29.dahlia" as const;

export type OpsDragStripeMode = "test" | "live";

function readRestrictedKey(): { key: string; mode: OpsDragStripeMode } {
  const key = process.env.STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY?.trim() ?? "";
  if (key.startsWith("rk_test_")) return { key, mode: "test" };
  if (key.startsWith("rk_live_")) return { key, mode: "live" };
  throw new Error("Ops Drag Report requires a Stripe restricted key");
}

export function assertCheckoutCreationEnabled(mode: OpsDragStripeMode): void {
  if (process.env.OPS_DRAG_REPORT_CHECKOUT_ENABLED !== "true") {
    throw new Error("Ops Drag Report checkout remains under launch hold");
  }
  if (mode === "live" && process.env.OPS_DRAG_REPORT_LIVE_ENABLED !== "true") {
    throw new Error("Live Ops Drag Report checkout is not authorized");
  }
}

export function createOpsDragStripeClient(options: { requireCheckoutGate?: boolean } = {}): {
  client: Stripe;
  mode: OpsDragStripeMode;
} {
  if (
    options.requireCheckoutGate &&
    process.env.OPS_DRAG_REPORT_CHECKOUT_ENABLED !== "true"
  ) {
    throw new Error("Ops Drag Report checkout remains under launch hold");
  }
  const { key, mode } = readRestrictedKey();
  if (options.requireCheckoutGate) assertCheckoutCreationEnabled(mode);

  return {
    client: new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      telemetry: false,
    }),
    mode,
  };
}

export function readWebhookSecret(): string {
  const secret = process.env.STRIPE_OPS_DRAG_REPORT_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret.startsWith("whsec_")) {
    throw new Error("Ops Drag Report webhook signature secret is not configured");
  }
  return secret;
}
