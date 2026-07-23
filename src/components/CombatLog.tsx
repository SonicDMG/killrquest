"use client";

import { useEffect, useRef } from "react";
import type { CombatLogEntry } from "@/lib/types";

interface Props {
  entries: CombatLogEntry[];
  heroName: string;
}

export default function CombatLog({ entries, heroName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div ref={containerRef} className="overflow-y-auto space-y-1 pr-1 h-80">
      {entries.map((entry, i) => {
        const isHero = entry.attacker === heroName;
        const isHealing = entry.healing !== undefined;

        return (
          <div
            key={i}
            className={`text-xs rounded px-2 py-1 flex gap-2 items-start ${
              isHero ? "bg-blue-950/60" : "bg-red-950/60"
            }`}
          >
            {/* Badge */}
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded-full font-bold text-xs ${
                isHero
                  ? "bg-blue-600 text-white"
                  : "bg-red-700 text-white"
              }`}
            >
              {isHero ? "HERO" : "MON"}
            </span>

            <span className="text-gray-200 leading-tight">
              {isHealing ? (
                <>
                  <span className="text-yellow-300 font-semibold">
                    {entry.abilityUsed ?? "heals"}
                  </span>{" "}
                  — restores{" "}
                  <span className="text-green-400 font-bold">
                    {entry.healing} HP
                  </span>{" "}
                  (→ {isHero ? entry.resultHp.hero : entry.resultHp.monster}{" "}
                  HP)
                </>
              ) : (
                <>
                  {entry.abilityUsed ? (
                    <span className="text-yellow-300 font-semibold">
                      {entry.abilityUsed}
                    </span>
                  ) : (
                    <span className="text-gray-300">{entry.attacker}</span>
                  )}{" "}
                  rolls{" "}
                  <span className="font-mono">
                    {entry.roll}+{entry.total - entry.roll}=
                    <span className="font-bold">{entry.total}</span>
                  </span>{" "}
                  vs AC {entry.ac} —{" "}
                  {entry.hit ? (
                    <>
                      <span className="text-green-400 font-bold">HIT!</span>{" "}
                      <span className="text-red-400 font-bold">
                        {entry.damage} dmg
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500 font-bold">MISS</span>
                  )}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
