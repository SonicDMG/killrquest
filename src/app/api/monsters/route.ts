import { NextRequest, NextResponse } from "next/server";
import { monstersCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cursor = q
    ? monstersCollection.find({}, { sort: { $lexical: q }, limit: 50 })
    : monstersCollection.find({}, { limit: 100 });
  const all = await cursor.toArray();
  // Only surface monsters with a working external image URL, weakest first
  const monsters = all
    .filter((m) => m.imageUrl && !m.imageUrl.startsWith("/"))
    .sort((a, b) => (a.maxHitPoints - b.maxHitPoints) || (a.armorClass - b.armorClass));
  return NextResponse.json({ monsters, query: q, count: monsters.length });
}
