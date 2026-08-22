const HELD_RESPONSE = { error: "Ops Drag Report retention cleanup is disabled" };

export async function GET() {
  return Response.json(HELD_RESPONSE, { status: 423 });
}

export const POST = GET;
