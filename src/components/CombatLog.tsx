"use client";

import { useEffect, useRef } from "react";
import type { CombatLogEntry } from "@/lib/types";

interface Props {
  entries: CombatLogEntry[];
  heroName: string;
  winner?: string; // name of winner once battle is done
}

export default function CombatLog({ entries, heroName, winner }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever entries grow or winner appears
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, winner]);

  if (entries.length === 0) return null;

  return (
    <div
      className="rounded-t-lg border-t-4 border-l-4 border-r-4 overflow-hidden"
      style={{ borderColor: "#5C4033" }}
    >
      {/* Parchment header */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ background: "#5C4033" }}
      >
        <span className="text-amber-100 font-bold text-sm" style={{ fontFamily: "serif" }}>
          ⚔️ Battle Log
        </span>
      </div>

      {/* Parchment body */}
      <div
        ref={containerRef}
        className="parchment-paper overflow-y-auto space-y-1 p-3"
        style={{ maxHeight: "320px" }}
      >
        {entries.map((entry, i) => {
          const isHero = entry.attacker === heroName;
          const isHealing = entry.healing !== undefined;

          // Per-type row colours matching reference
          const rowClass = isHealing
            ? "bg-green-50 text-green-800"
            : isHero
            ? "bg-red-50 text-red-800"
            : "bg-stone-100 text-stone-700";

          const badgeClass = isHero
            ? "bg-red-200 text-red-900"
            : "bg-stone-300 text-stone-800";

          return (
            <div
              key={i}
              className={`text-xs rounded px-2 py-1 flex gap-2 items-start font-mono ${rowClass}`}
            >
              {/* Badge */}
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold text-xs tracking-wide ${badgeClass}`}>
                {isHero ? "HERO" : "MON"}
              </span>

              <span className="leading-tight">
                {isHealing ? (
                  <>
                    <span className="font-semibold">{entry.abilityUsed ?? "heals"}</span>
                    {" — restores "}
                    <span className="font-bold text-green-700">{entry.healing} HP</span>
                    {` (→ ${isHero ? entry.resultHp.hero : entry.resultHp.monster} HP)`}
                  </>
                ) : (
                  <>
                    {entry.abilityUsed ? (
                      <span className="font-semibold">{entry.abilityUsed}</span>
                    ) : (
                      <span>{entry.attacker}</span>
                    )}{" "}
                    rolls{" "}
                    <span className="font-mono">
                      {entry.roll}+{entry.total - entry.roll}=
                      <span className="font-bold">{entry.total}</span>
                    </span>{" "}
                    vs AC {entry.ac} —{" "}
                    {entry.hit ? (
                      <>
                        <span className="font-bold text-amber-700">HIT!</span>{" "}
                        <span className="font-bold text-orange-700">{entry.damage} dmg</span>
                      </>
                    ) : (
                      <span className="font-bold text-stone-400">MISS</span>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
        {/* Outcome banner — at bottom, newest-first order */}
        {winner && (
          <div className="text-xs rounded px-2 py-1.5 text-center font-bold font-serif bg-amber-100 text-amber-900 border border-amber-400 tracking-wide">
            🏆 {winner} wins!
          </div>
        )}
      </div>
    </div>
  );
}
