"use client";

import { useState } from "react";
import type { Hero, Monster } from "@/lib/types";

interface Props {
  character: Hero | Monster;
  selected: boolean;
  onClick: () => void;
}

export default function CharacterCard({ character, selected, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const hero = character as Hero;

  const ringClass = selected
    ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900"
    : "ring-1 ring-white/10";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl overflow-hidden bg-gray-800 hover:bg-gray-700 transition-all ${ringClass} focus:outline-none`}
    >
      {/* Image */}
      <div className="relative h-36 w-full bg-gray-700 overflow-hidden">
        {!imgError && character.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            style={
              character.imagePosition
                ? {
                    objectPosition: `${character.imagePosition.offsetX}px ${character.imagePosition.offsetY}px`,
                  }
                : undefined
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
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
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-bold text-white text-sm leading-tight">
            {character.name}
          </h3>
          {hero.class && (
            <p className="text-xs text-gray-400">{hero.class}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-xs">
          <span className="text-red-400">
            ❤️ {character.hitPoints}/{character.maxHitPoints}
          </span>
          <span className="text-blue-400">🛡️ {character.armorClass}</span>
          <span className="text-green-400">
            ⚔️ +{character.attackBonus}/{character.damageDie}
          </span>
        </div>

        {/* Abilities */}
        {character.abilities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {character.abilities.slice(0, 4).map((ab) => (
              <span
                key={ab.name}
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  ab.type === "healing"
                    ? "bg-green-900 text-green-300"
                    : "bg-purple-900 text-purple-300"
                }`}
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
