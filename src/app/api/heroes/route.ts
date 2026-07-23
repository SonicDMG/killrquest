import { NextRequest, NextResponse } from "next/server";
import { heroesCollection } from "@/lib/astra";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cursor = q
    ? heroesCollection.find({}, { sort: { $vectorize: q }, limit: 20 })
    : heroesCollection.find({}, { limit: 30 });
  const heroes = await cursor.toArray();
  return NextResponse.json({ heroes, query: q, count: heroes.length });
}
