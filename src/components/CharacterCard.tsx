"use client";

import { useState } from "react";
import type { Hero, Monster } from "@/lib/types";

interface Props {
  character: Hero | Monster;
  selected: boolean;
  /** 0-based position in the roster; -1 if not selected */
  rosterIndex?: number;
  onClick: () => void;
}

export default function CharacterCard({ character, selected, rosterIndex = -1, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const hero = character as Hero;

  const ringClass = selected
    ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900"
    : "ring-1 ring-white/10";

  const borderColor = selected ? "#b45309" : "#57534e";
  const bgColor = selected ? "#1c1008" : "#1c1917";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl overflow-hidden transition-all focus:outline-none ${ringClass}`}
      style={{ background: bgColor, border: `2px solid ${borderColor}` }}
    >
      {/* Image */}
      <div className="relative h-36 w-full overflow-hidden" style={{ background: "#292524" }}>
        {!imgError && character.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.imageUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#292524" }}>
            <span className="text-4xl">⚔️</span>
          </div>
        )}
        {/* Color tint overlay */}
        {character.color && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundColor: character.color }}
          />
        )}
        {/* Roster position badge */}
        {selected && rosterIndex >= 0 && (
          <div
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10"
            style={{ background: "#b45309", color: "#fef3c7", fontFamily: "serif" }}
          >
            {rosterIndex + 1}
          </div>
        )}
        {/* Selected warm glow */}
        {selected && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 20px rgba(180,83,9,0.3)" }} />
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div>
          <h3
            className="font-bold text-sm leading-tight"
            style={{ color: selected ? "#fde68a" : "#e7e5e4", fontFamily: "serif" }}
          >
            {character.name}
          </h3>
          {hero.class && (
            <p className="text-xs" style={{ color: "#a8a29e" }}>{hero.class}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-xs font-mono" style={{ color: "#a8a29e" }}>
          <span className="text-red-400">
            ❤️ {character.hitPoints}/{character.maxHitPoints}
          </span>
          <span style={{ color: "#93c5fd" }}>🛡️ {character.armorClass}</span>
          <span className="text-amber-400">
            ⚔️ +{character.attackBonus}/{character.damageDie}
          </span>
        </div>

        {/* Abilities */}
        {character.abilities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {character.abilities.slice(0, 4).map((ab) => (
              <span
                key={ab.name}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={
                  ab.type === "healing"
                    ? { background: "#14532d", color: "#86efac" }
                    : { background: "#4c1d95", color: "#c4b5fd" }
                }
              >
                {ab.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
