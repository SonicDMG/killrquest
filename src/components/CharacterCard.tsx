"use client";

import { useCallback, useRef } from "react";
import type { Hero, Monster } from "@/lib/types";
import ImagePanContainer from "./ImagePanContainer";

interface Props {
  character: Hero | Monster;
  selected: boolean;
  /** 0-based position in the roster; -1 if not selected */
  rosterIndex?: number;
  onClick: () => void;
  /** Called when the user commits a new image position */
  onPositionChange?: (id: string, collection: "heroes" | "monsters", x: number, y: number) => void;
}

export default function CharacterCard({
  character,
  selected,
  rosterIndex = -1,
  onClick,
  onPositionChange,
}: Props) {
  const hero = character as Hero;
  const collection: "heroes" | "monsters" = hero.class !== undefined ? "heroes" : "monsters";

  const ringClass = selected
    ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900"
    : "ring-1 ring-white/10";

  const borderColor = selected ? "#b45309" : "#57534e";
  const bgColor = selected ? "#1c1008" : "#1c1917";

  // Suppress the card's onClick when the image drag moved the pointer
  const didDragRef = useRef(false);

  const handleCommit = useCallback(
    (x: number, y: number) => {
      didDragRef.current = true;
      if (onPositionChange) {
        onPositionChange(character._id, collection, x, y);
      } else {
        // Default: PATCH directly
        fetch(`/api/${collection}/${character._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePosition: { offsetX: x, offsetY: y } }),
        }).catch(() => {});
      }
    },
    [character._id, collection, onPositionChange]
  );

  const handleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onClick();
  }, [onClick]);

  return (
    <div
      className={`w-full text-left rounded-xl overflow-hidden transition-all ${ringClass}`}
      style={{ background: bgColor, border: `2px solid ${borderColor}` }}
    >
      {/* Image — pannable */}
      <ImagePanContainer
        imgSrc={character.imageUrl}
        imgAlt={character.name}
        offsetX={character.imagePosition?.offsetX ?? 50}
        offsetY={character.imagePosition?.offsetY ?? 20}
        onCommit={handleCommit}
        className="relative h-36 w-full"
        style={{ background: "#292524", cursor: undefined }}
        onClick={handleClick}
      >
        {/* Color tint overlay */}
        {character.color && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none z-10"
            style={{ backgroundColor: character.color }}
          />
        )}
        {/* Roster position badge */}
        {selected && rosterIndex >= 0 && (
          <div
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20"
            style={{ background: "#b45309", color: "#fef3c7", fontFamily: "serif" }}
          >
            {rosterIndex + 1}
          </div>
        )}
        {/* Selected warm glow */}
        {selected && (
          <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: "inset 0 0 20px rgba(180,83,9,0.3)" }} />
        )}
      </ImagePanContainer>

      {/* Clickable body — selecting the character */}
      <button
        onClick={handleClick}
        className="w-full text-left p-3 space-y-2 focus:outline-none"
      >
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
      </button>
    </div>
  );
}
