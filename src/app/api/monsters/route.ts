import { NextRequest, NextResponse } from "next/server";
import { monstersCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cursor = q
    ? monstersCollection.find({}, { sort: { $vectorize: q }, limit: 50, includeSimilarity: true })
    : monstersCollection.find({}, { limit: 100 });
  const all = await cursor.toArray();
  // Only surface monsters with a working external image URL.
  // When searching, preserve the vector ranking order. When browsing, sort weakest first.
  const filtered = all.filter((m) => m.imageUrl && !m.imageUrl.startsWith("/"));
  const monsters = q
    ? filtered
    : filtered.sort((a, b) => (a.maxHitPoints - b.maxHitPoints) || (a.armorClass - b.armorClass));
  const similarities = monsters.map((m) => (m as Record<string, unknown>).$similarity as number | undefined ?? null);
  const clean = monsters.map((m) => { const c = { ...m } as Record<string, unknown>; delete c.$similarity; return c; });
  return NextResponse.json({ monsters: clean, similarities, query: q, count: clean.length });
}
