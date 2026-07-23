import { NextRequest, NextResponse } from "next/server";
import { heroesCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cursor = q
    ? heroesCollection.find({}, { sort: { $vectorize: q }, limit: 20, includeSimilarity: true })
    : heroesCollection.find({}, { limit: 30 });
  const heroes = await cursor.toArray();
  // Pull $similarity out into a parallel array so the client can use it without
  // touching the Hero type, then strip it from the hero objects themselves.
  const similarities = heroes.map((h) => (h as Record<string, unknown>).$similarity as number | undefined ?? null);
  const clean = heroes.map((h) => { const c = { ...h } as Record<string, unknown>; delete c.$similarity; return c; });
  return NextResponse.json({ heroes: clean, similarities, query: q, count: clean.length });
}
