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
