"use client";

import { useState, useEffect } from "react";
import type { Hero, Monster, CombatLogEntry } from "@/lib/types";
import { runCombat } from "@/lib/combat";
import CombatLog from "./CombatLog";

interface Props {
  hero: Hero | null;
  monster: Monster | null;
  onReset: () => void;
}

type CombatState = "idle" | "fighting" | "done";

function MiniStatCard({
  character,
  label,
  currentHp,
}: {
  character: Hero | Monster;
  label: string;
  currentHp: number;
}) {
  return (
    <div className="flex-1 bg-gray-800 rounded-lg p-3 text-sm space-y-1">
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="font-bold text-white">{character.name}</div>
      <div className="text-xs flex gap-2">
        <span className="text-red-400">❤️ {currentHp}/{character.maxHitPoints}</span>
        <span className="text-blue-400">🛡️ {character.armorClass}</span>
        <span className="text-green-400">⚔️ +{character.attackBonus}</span>
      </div>
    </div>
  );
}

export default function CombatArena({ hero, monster, onReset }: Props) {
  const [state, setState] = useState<CombatState>("idle");
  const [allEntries, setAllEntries] = useState<CombatLogEntry[]>([]);
  const [displayedEntries, setDisplayedEntries] = useState<CombatLogEntry[]>([]);
  const [heroHp, setHeroHp] = useState(0);
  const [monsterHp, setMonsterHp] = useState(0);

  // Reset displayed state when combatants change
  useEffect(() => {
    if (state === "idle") {
      setDisplayedEntries([]);
      setAllEntries([]);
      setHeroHp(hero?.hitPoints ?? 0);
      setMonsterHp(monster?.hitPoints ?? 0);
    }
  }, [hero, monster, state]);

  // Drip-feed entries at 150ms
  useEffect(() => {
    if (state !== "fighting" || allEntries.length === 0) return;

    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      const slice = allEntries.slice(0, idx);
      setDisplayedEntries(slice);
      const last = slice[slice.length - 1];
      if (last) {
        setHeroHp(last.resultHp.hero);
        setMonsterHp(last.resultHp.monster);
      }
      if (idx >= allEntries.length) {
        clearInterval(timer);
        setState("done");
      }
    }, 150);

    return () => clearInterval(timer);
  }, [allEntries, state]);

  const handleFight = async () => {
    if (!hero || !monster) return;
    setState("fighting");
    setDisplayedEntries([]);
    setAllEntries([]);

    // Fresh point-reads from Astra (REQ-012)
    const [heroRes, monsterRes] = await Promise.all([
      fetch(`/api/heroes/${hero._id}`),
      fetch(`/api/monsters/${monster._id}`),
    ]);
    const { hero: freshHero } = await heroRes.json() as { hero: Hero };
    const { monster: freshMonster } = await monsterRes.json() as { monster: Monster };

    setHeroHp(freshHero.hitPoints);
    setMonsterHp(freshMonster.hitPoints);

    const entries = runCombat(freshHero, freshMonster);
    setAllEntries(entries);
  };

  const handleReset = () => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    onReset();
  };

  const heroWon =
    state === "done" && heroHp > 0 && monsterHp <= 0;
  const monsterWon =
    state === "done" && monsterHp > 0 && heroHp <= 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Combatant summaries */}
      <div className="flex gap-3">
        {hero ? (
          <MiniStatCard character={hero} label="Hero" currentHp={heroHp} />
        ) : (
          <div className="flex-1 bg-gray-800/40 rounded-lg p-3 text-sm text-gray-500 text-center border border-dashed border-gray-700">
            Pick a hero →
          </div>
        )}
        <div className="flex items-center text-2xl text-gray-500">⚔️</div>
        {monster ? (
          <MiniStatCard character={monster} label="Monster" currentHp={monsterHp} />
        ) : (
          <div className="flex-1 bg-gray-800/40 rounded-lg p-3 text-sm text-gray-500 text-center border border-dashed border-gray-700">
            ← Pick a monster
          </div>
        )}
      </div>

      {/* Fight button */}
      {state === "idle" && (
        <button
          onClick={handleFight}
          disabled={!hero || !monster}
          className="w-full py-3 rounded-xl font-bold text-lg bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ⚔️ Fight!
        </button>
      )}

      {state === "fighting" && (
        <div className="text-center text-yellow-400 font-bold animate-pulse">
          Combat in progress…
        </div>
      )}

      {/* Combat log */}
      {displayedEntries.length > 0 && (
        <CombatLog
          entries={displayedEntries}
          heroName={hero?.name ?? ""}
        />
      )}

      {/* Result banner */}
      {state === "done" && (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-4 text-center font-bold text-lg ${
              heroWon
                ? "bg-blue-900 border border-blue-400 text-blue-200"
                : monsterWon
                ? "bg-red-900 border border-red-500 text-red-200"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            {heroWon && `🏆 ${hero?.name} wins with ${heroHp} HP remaining!`}
            {monsterWon && `💀 ${monster?.name} wins with ${monsterHp} HP remaining!`}
            {!heroWon && !monsterWon && "Draw — both survived the turn limit!"}
          </div>
          <button
            onClick={handleReset}
            className="w-full py-2 rounded-xl font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  );
}
