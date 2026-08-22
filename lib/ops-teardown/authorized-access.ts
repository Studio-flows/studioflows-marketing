import type { SupabaseClient } from "@supabase/supabase-js";

import { createMarketingSupabaseServerClient } from "../supabase-server.js";
import type { OpsDragOrder } from "../ops-drag-report/order-foundation.ts";
import {
  assertOpsTeardownOrderBinding,
  verifyOpsTeardownAccessToken,
  type OpsTeardownAccessPurpose,
} from "./access-token.ts";
import {
  buildOpsTeardownSheet,
  mapLeadRowToTeardownInput,
  type OpsTeardownSheet,
} from "./build-teardown-sheet.js";
import { fetchLeadRow } from "./load-teardown-sheet.js";
import { sendTeardownEmail } from "./send-teardown-email.js";

type LeadRow = Record<string, unknown> & {
  id?: string;
  metadata?: Record<string, unknown>;
};

export type AuthorizedTeardown = {
  sheet: OpsTeardownSheet;
  recipientEmail: string;
  order: OpsDragOrder;
};

export type OpsTeardownAccessDependencies = {
  createClient: () => SupabaseClient | null;
  fetchRow: (client: SupabaseClient, leadId: string) => Promise<LeadRow | null>;
  signingSecret: () => string;
  now: () => string;
};

export type OpsTeardownEmailDependencies = OpsTeardownAccessDependencies & {
  sendEmail: typeof sendTeardownEmail;
};

const defaultAccessDependencies: OpsTeardownAccessDependencies = {
  createClient: createMarketingSupabaseServerClient,
  fetchRow: fetchLeadRow,
  signingSecret: () => process.env.OPS_DRAG_REPORT_ORDER_TOKEN_SECRET?.trim() ?? "",
  now: () => new Date().toISOString(),
};

function readOrder(row: LeadRow): OpsDragOrder {
  const metadata = row.metadata;
  const value = metadata?.ops_drag_report_order;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ops teardown access denied");
  }
  return value as OpsDragOrder;
}

export function rejectClientSuppliedTeardownIdentity(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const record = body as Record<string, unknown>;
  if (["lead_id", "email", "to_email", "order_id", "checkout_session_id"].some((key) => key in record)) {
    throw new Error("Ops teardown access denied");
  }
}

export async function loadAuthorizedOpsTeardown(
  input: { authorization: string | null; purpose: OpsTeardownAccessPurpose },
  dependencies: OpsTeardownAccessDependencies = defaultAccessDependencies,
): Promise<AuthorizedTeardown> {
  let claims;
  try {
    claims = verifyOpsTeardownAccessToken({
      authorization: input.authorization,
      expectedPurpose: input.purpose,
      recordedAt: dependencies.now(),
      secret: dependencies.signingSecret(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Ops teardown access unavailable") throw error;
    throw new Error("Ops teardown access denied");
  }

  const client = dependencies.createClient();
  if (!client) throw new Error("Ops teardown access unavailable");
  try {
    const row = await dependencies.fetchRow(client, claims.lead_id);
    if (!row || row.id !== claims.lead_id) throw new Error("Ops teardown access denied");
    const order = readOrder(row);
    const recipientEmail = assertOpsTeardownOrderBinding(order, claims);
    return {
      sheet: buildOpsTeardownSheet(mapLeadRowToTeardownInput(row, claims.lead_id)),
      recipientEmail,
      order,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Ops teardown access denied") throw error;
    throw new Error("Ops teardown access unavailable");
  }
}

export async function sendAuthorizedOpsTeardownEmail(
  input: { authorization: string | null; body: unknown; siteOrigin: string },
  dependencies: OpsTeardownEmailDependencies = { ...defaultAccessDependencies, sendEmail: sendTeardownEmail },
) {
  rejectClientSuppliedTeardownIdentity(input.body);
  const authorized = await loadAuthorizedOpsTeardown(
    { authorization: input.authorization, purpose: "email" },
    dependencies,
  );
  return dependencies.sendEmail({
    sheet: authorized.sheet,
    toEmail: authorized.recipientEmail,
    siteOrigin: input.siteOrigin,
  });
}

export function opsTeardownErrorResponse(error: unknown): Response {
  const unavailable = error instanceof Error && error.message === "Ops teardown access unavailable";
  return Response.json(
    { error: unavailable ? "Ops teardown access unavailable" : "Ops teardown access denied" },
    { status: unavailable ? 503 : 401 },
  );
}
