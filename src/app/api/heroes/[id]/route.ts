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
