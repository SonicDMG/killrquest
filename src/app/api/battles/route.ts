import { NextRequest, NextResponse } from "next/server";
import { battlesCollection } from "@/lib/astra";
import type { BattleRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const {
    heroes, monsters, winner, turns, abilitiesUsed,
  } = body as Omit<BattleRecord, "_id" | "foughtAt" | "$vectorize">;

  const abilitySummary =
    abilitiesUsed.length > 0
      ? ` Notable abilities used: ${abilitiesUsed.join(", ")}.`
      : "";

  const vectorize =
    `${heroes} fought ${monsters}. ` +
    `${winner === "heroes" ? heroes : winner === "monsters" ? monsters : "Neither side"} won in ${turns} turn${turns === 1 ? "" : "s"}.` +
    abilitySummary;

  const record: BattleRecord = {
    foughtAt: new Date().toISOString(),
    heroes,
    monsters,
    winner,
    turns,
    abilitiesUsed,
    $vectorize: vectorize,
  };

  await battlesCollection.insertOne(record);
  return NextResponse.json({ ok: true });
}
