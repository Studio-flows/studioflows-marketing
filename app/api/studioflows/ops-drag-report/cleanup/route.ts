import { createClient } from "@supabase/supabase-js";

import {
  assertRetentionSchedulerRequest,
  runSupabaseRetentionCleanup,
} from "@/lib/ops-drag-report/retention-runtime";

export const runtime = "nodejs";

function createRetentionSupabaseClient() {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceRoleKey) throw new Error("Ops Drag Report retention storage is not configured");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: Request) {
  try {
    assertRetentionSchedulerRequest({
      authorization: request.headers.get("authorization"),
      expectedSecret: process.env.OPS_DRAG_REPORT_RETENTION_WORKER_SECRET,
      enabled: process.env.OPS_DRAG_REPORT_RETENTION_WORKER_ENABLED,
      mutationEnabled: process.env.OPS_DRAG_REPORT_RETENTION_MUTATION_ENABLED,
    });
    const result = await runSupabaseRetentionCleanup({
      supabase: createRetentionSupabaseClient(),
      now: new Date().toISOString(),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retention cleanup rejected";
    const status = message.includes("authorization")
      ? 401
      : message.includes("disabled")
        ? 423
        : 503;
    return Response.json({ error: message }, { status });
  }
}

export const POST = GET;
