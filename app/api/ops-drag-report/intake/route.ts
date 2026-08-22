import { NextResponse } from "next/server";

const HELD = { error: "Ops Drag Report intake remains held for accepted launch release" } as const;

export async function GET() {
  return NextResponse.json(HELD, { status: 423 });
}

export async function POST() {
  return NextResponse.json(HELD, { status: 423 });
}
