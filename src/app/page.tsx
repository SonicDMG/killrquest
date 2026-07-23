"use client";

import { useState } from "react";
import type { Hero, Monster } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import CharacterCard from "@/components/CharacterCard";
import CombatArena from "@/components/CombatArena";

export default function Home() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  const handleHeroClick = (hero: Hero) => {
    setSelectedHero((prev) => (prev?._id === hero._id ? null : hero));
  };

  const handleMonsterClick = (monster: Monster) => {
    setSelectedMonster((prev) => (prev?._id === monster._id ? null : monster));
  };

  const handleReset = () => {
    setSelectedHero(null);
    setSelectedMonster(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-yellow-400">
          ⚔️ KillrQuest
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Powered by Astra DB — NVIDIA vector search + lexical rerank
        </p>
      </header>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Heroes */}
        <aside className="w-72 xl:w-80 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Hero Roster
            </h2>
            <SearchBar
              collection="heroes"
              onResults={(r) => setHeroes(r as Hero[])}
              placeholder="Search heroes…"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {heroes.map((hero) => (
              <CharacterCard
                key={hero._id}
                character={hero}
                selected={selectedHero?._id === hero._id}
                onClick={() => handleHeroClick(hero)}
              />
            ))}
          </div>
        </aside>

        {/* CENTER — Combat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 pb-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Combat Arena
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <CombatArena
              hero={selectedHero}
              monster={selectedMonster}
              onReset={handleReset}
            />
          </div>
        </main>

        {/* RIGHT — Monsters */}
        <aside className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-gray-800 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Monster Roster
            </h2>
            <SearchBar
              collection="monsters"
              onResults={(r) => setMonsters(r as Monster[])}
              placeholder="Search monsters…"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {monsters.map((monster) => (
              <CharacterCard
                key={monster._id}
                character={monster}
                selected={selectedMonster?._id === monster._id}
                onClick={() => handleMonsterClick(monster)}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
