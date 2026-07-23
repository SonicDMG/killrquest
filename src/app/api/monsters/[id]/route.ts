import { NextRequest, NextResponse } from "next/server";
import { monstersCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const monster = await monstersCollection.findOne({ _id: params.id });
  if (!monster)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ monster });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  await monstersCollection.updateOne({ _id: params.id }, { $set: body });
  return NextResponse.json({ ok: true });
}
