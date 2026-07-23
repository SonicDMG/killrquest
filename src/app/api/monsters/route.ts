import { NextRequest, NextResponse } from "next/server";
import { monstersCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cursor = q
    ? monstersCollection.find({}, { sort: { $lexical: q }, limit: 20 })
    : monstersCollection.find({}, { limit: 30 });
  const monsters = await cursor.toArray();
  return NextResponse.json({ monsters, query: q, count: monsters.length });
}
