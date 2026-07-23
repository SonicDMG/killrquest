"use client";

import { useState } from "react";
import type { Hero, Monster, SearchHit } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import CharacterCard from "@/components/CharacterCard";
import CombatArena from "@/components/CombatArena";

export default function Home() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [heroRoster, setHeroRoster] = useState<Hero[]>([]);
  const [monsterRoster, setMonsterRoster] = useState<Monster[]>([]);

  const toggleHero = (hero: Hero) => {
    setHeroRoster((prev) =>
      prev.some((h) => h._id === hero._id)
        ? prev.filter((h) => h._id !== hero._id)
        : [...prev, hero]
    );
  };

  const toggleMonster = (monster: Monster) => {
    setMonsterRoster((prev) =>
      prev.some((m) => m._id === monster._id)
        ? prev.filter((m) => m._id !== monster._id)
        : [...prev, monster]
    );
  };

  const handleReset = () => {
    setHeroRoster([]);
    setMonsterRoster([]);
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 h-14 flex items-center">
        <h1 className="text-2xl font-bold tracking-tight text-yellow-400">
          ⚔️ KillrQuest
        </h1>
        <div className="ml-auto flex items-center gap-3 select-none">
          <span className="text-xs text-gray-600 font-mono tracking-wide">powered by</span>

          {/* Astra DB badge */}
          <div className="group relative flex items-center gap-1.5 cursor-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-astra.png" alt="Astra DB" className="h-5 w-5 rounded-sm opacity-60 object-contain" />
            <span className="text-xs text-gray-600 font-mono">Astra DB</span>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
              <p className="font-semibold text-white mb-1">Astra DB</p>
              <p>Cloud-native vector database by DataStax. Stores all hero and monster records and handles both vector and lexical indexes in a single collection.</p>
            </div>
          </div>

          <span className="text-xs text-gray-700 font-mono">+</span>

          {/* NVIDIA vector search badge */}
          <div className="group relative flex items-center gap-1.5 cursor-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-nvidia.svg" alt="NVIDIA" className="h-3.5 opacity-30 object-contain" style={{ filter: "invert(1)" }} />
            <span className="text-xs text-gray-600 font-mono">vector search</span>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
              <p className="font-semibold text-white mb-1">NVIDIA vector search</p>
              <p>Each character description is embedded using <span className="text-yellow-400 font-mono">nv-embedqa-e5-v5</span> — an NVIDIA model that encodes meaning, not just keywords. When you search, your query is embedded the same way and Astra finds the nearest matches by cosine similarity.</p>
              <p className="mt-1.5 text-gray-500">Hover a result&apos;s &ldquo;why these results?&rdquo; link to see similarity scores.</p>
            </div>
          </div>

          <span className="text-xs text-gray-700 font-mono">+</span>

          {/* Lexical rerank badge */}
          <div className="group relative flex items-center gap-1.5 cursor-default">
            <span className="text-xs text-gray-600 font-mono">lexical rerank</span>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
              <p className="font-semibold text-white mb-1">Lexical rerank</p>
              <p>BM25 lexical index and <span className="text-yellow-400 font-mono">llama-3.2-nv-rerankqa-1b-v2</span> reranker are configured on the collections. Sorting by <span className="font-mono text-gray-400">$lexical</span> triggers Astra to run BM25 recall then re-score results using NVIDIA&apos;s cross-encoder model — combining keyword precision with semantic understanding.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Heroes */}
        <aside className="w-72 xl:w-80 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Hero Roster
              </h2>
              {heroRoster.length > 0 && (
                <span className="text-xs font-bold text-yellow-400 font-mono">
                  {heroRoster.length} selected
                </span>
              )}
            </div>
            <SearchBar
              collection="heroes"
              onResults={(hits) => setHeroes(hits.map((h) => h.doc as Hero))}
              placeholder="Search heroes…"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {heroes.map((hero) => (
              <CharacterCard
                key={hero._id}
                character={hero}
                selected={heroRoster.some((h) => h._id === hero._id)}
                rosterIndex={heroRoster.findIndex((h) => h._id === hero._id)}
                onClick={() => toggleHero(hero)}
              />
            ))}
          </div>
        </aside>

        {/* CENTER — Combat */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          <div className="px-6 pt-4 pb-3 border-b border-gray-800 shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Combat Arena
            </h2>
          </div>
          <div className="flex-1 overflow-hidden p-6" style={{ minHeight: 0 }}>
            <CombatArena
              heroes={heroRoster}
              monsters={monsterRoster}
              onReset={handleReset}
            />
          </div>
        </main>

        {/* RIGHT — Monsters */}
        <aside className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-gray-800 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Monster Roster
              </h2>
              {monsterRoster.length > 0 && (
                <span className="text-xs font-bold text-red-400 font-mono">
                  {monsterRoster.length} selected
                </span>
              )}
            </div>
            <SearchBar
              collection="monsters"
              onResults={(hits: SearchHit<Hero | Monster>[]) => setMonsters(hits.map((h) => h.doc as Monster))}
              placeholder="Search monsters…"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {monsters.map((monster) => (
              <CharacterCard
                key={monster._id}
                character={monster}
                selected={monsterRoster.some((m) => m._id === monster._id)}
                rosterIndex={monsterRoster.findIndex((m) => m._id === monster._id)}
                onClick={() => toggleMonster(monster)}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
