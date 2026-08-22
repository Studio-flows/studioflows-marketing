import {
  loadAuthorizedOpsTeardown,
  opsTeardownErrorResponse,
} from "@/lib/ops-teardown/authorized-access";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { sheet } = await loadAuthorizedOpsTeardown({
      authorization: req.headers.get("authorization"),
      purpose: "view",
    });
    return Response.json({ sheet });
  } catch (error) {
    return opsTeardownErrorResponse(error);
  }
}
