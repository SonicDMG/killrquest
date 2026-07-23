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
    hero, heroClass, monster, winner, turns,
    heroFinalHp, heroMaxHp, monsterFinalHp, monsterMaxHp,
    abilitiesUsed,
  } = body as Omit<BattleRecord, "_id" | "foughtAt" | "$vectorize">;

  const abilitySummary =
    abilitiesUsed.length > 0
      ? ` Notable abilities used: ${abilitiesUsed.join(", ")}.`
      : "";

  const vectorize =
    `${hero}${heroClass ? ` (${heroClass})` : ""} fought ${monster}. ` +
    `${winner} won in ${turns} turn${turns === 1 ? "" : "s"}. ` +
    `${hero} ended with ${heroFinalHp}/${heroMaxHp} HP. ` +
    `${monster} ended with ${monsterFinalHp}/${monsterMaxHp} HP.` +
    abilitySummary;

  const record: BattleRecord = {
    foughtAt: new Date().toISOString(),
    hero,
    heroClass: heroClass ?? null,
    monster,
    winner,
    turns,
    heroFinalHp,
    heroMaxHp,
    monsterFinalHp,
    monsterMaxHp,
    abilitiesUsed,
    $vectorize: vectorize,
  };

  await battlesCollection.insertOne(record);
  return NextResponse.json({ ok: true });
}
