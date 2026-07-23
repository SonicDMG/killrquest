import { NextRequest, NextResponse } from "next/server";
import { heroesCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hero = await heroesCollection.findOne({ _id: params.id });
  if (!hero) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ hero });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  await heroesCollection.updateOne({ _id: params.id }, { $set: body });
  return NextResponse.json({ ok: true });
}
