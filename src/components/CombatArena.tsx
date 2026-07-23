"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Hero, Monster, CombatLogEntry } from "@/lib/types";
import { runCombat } from "@/lib/combat";
import CombatLog from "./CombatLog";
import ChatPanel from "./ChatPanel";

// ── TASK-02: triggerCombatAnimation ──────────────────────────────────────────
function triggerCombatAnimation(
  entry: CombatLogEntry,
  heroName: string,
  heroRef: React.RefObject<HTMLDivElement>,
  monsterRef: React.RefObject<HTMLDivElement>
): void {
  const attackerIsHero = entry.attacker === heroName;
  const attackerEl = attackerIsHero ? heroRef.current : monsterRef.current;
  const defenderEl = attackerIsHero ? monsterRef.current : heroRef.current;
  if (!attackerEl || !defenderEl) return;

  // Healing — sparkle on the healer, no lunge
  if (entry.healing != null) {
    for (let i = 0; i < 5; i++) {
      const spark = document.createElement("div");
      spark.className = "battle-sparkle-particle";
      spark.style.left = `${20 + Math.random() * 60}%`;
      spark.style.top = `${30 + Math.random() * 40}%`;
      spark.style.animationDelay = `${i * 80}ms`;
      attackerEl.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
    }
    return;
  }

  if (entry.hit) {
    // Attacker lunges
    const lungeClass = attackerIsHero ? "battle-hit-hero" : "battle-hit-monster";
    attackerEl.classList.add(lungeClass);
    setTimeout(() => attackerEl.classList.remove(lungeClass), 600);

    // Defender shakes
    defenderEl.classList.add("battle-shake");
    setTimeout(() => defenderEl.classList.remove("battle-shake"), 500);

    // Flash on the attacker's facing edge
    const flash = document.createElement("div");
    flash.className = attackerIsHero ? "battle-flash-right" : "battle-flash-left";
    attackerEl.appendChild(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  } else {
    // Miss — wobbly stumble on attacker
    attackerEl.classList.add("battle-miss");
    setTimeout(() => attackerEl.classList.remove("battle-miss"), 600);
  }
}

interface Props {
  hero: Hero | null;
  monster: Monster | null;
  onReset: () => void;
}

type CombatState = "idle" | "fighting" | "done";

// ── HP bar ────────────────────────────────────────────────────────────────────
function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const colour =
    pct > 60 ? "#16a34a" : pct > 30 ? "#d97706" : "#dc2626";
  return (
    <div className="w-full h-1.5 rounded-full bg-stone-300 overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: colour }}
      />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  character,
  label,
  currentHp,
  isHero,
}: {
  character: Hero | Monster;
  label: string;
  currentHp: number;
  isHero: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-lg p-3 text-sm space-y-1 border-2"
      style={{
        background: isHero
          ? "linear-gradient(135deg,#fdf8f0 0%,#f5edd8 100%)"
          : "linear-gradient(135deg,#fdf0f0 0%,#f5d8d8 100%)",
        borderColor: isHero ? "#92400e" : "#991b1b",
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: isHero ? "#92400e" : "#991b1b", fontFamily: "serif" }}
      >
        {label}
      </div>
      <div className="font-bold text-stone-800" style={{ fontFamily: "serif" }}>
        {character.name}
      </div>
      <HpBar current={currentHp} max={character.maxHitPoints} />
      <div className="text-xs flex gap-2 text-stone-600 font-mono">
        <span>❤️ {currentHp}/{character.maxHitPoints}</span>
        <span>🛡️ {character.armorClass}</span>
        <span>⚔️ +{character.attackBonus}</span>
      </div>
    </div>
  );
}

// ── TASK-03: BattleVisual ─────────────────────────────────────────────────────
function BattleVisual({
  hero,
  monster,
  heroHp,
  monsterHp,
  heroCardRef,
  monsterCardRef,
  state,
}: {
  hero: Hero;
  monster: Monster;
  heroHp: number;
  monsterHp: number;
  heroCardRef: React.RefObject<HTMLDivElement>;
  monsterCardRef: React.RefObject<HTMLDivElement>;
  state: "idle" | "fighting" | "done";
}) {
  const [heroImgError, setHeroImgError] = useState(false);
  const [monsterImgError, setMonsterImgError] = useState(false);

  const heroDefeated = state !== "idle" && heroHp <= 0;
  const monsterDefeated = state !== "idle" && monsterHp <= 0;

  return (
    <div className="flex gap-3 items-stretch">
      {/* Hero card */}
      <div
        ref={heroCardRef}
        className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-all duration-500 ${
          heroDefeated ? "battle-card-defeated" : ""
        }`}
        style={{ borderColor: heroDefeated ? "#44403c" : "#92400e", minHeight: 140 }}
      >
        {!heroImgError && hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt={hero.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setHeroImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
            <span className="text-4xl">⚔️</span>
          </div>
        )}
        {/* Colour tint */}
        {hero.color && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundColor: hero.color }} />
        )}
        {/* Name + HP overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1">
          <div className="text-xs font-bold text-amber-200 truncate" style={{ fontFamily: "serif" }}>
            {hero.name}
          </div>
          <HpBar current={heroHp} max={hero.maxHitPoints} />
        </div>
        {heroDefeated && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">💀</span>
          </div>
        )}
      </div>

      {/* VS divider */}
      <div className="flex flex-col items-center justify-center gap-1 px-1">
        <span className="text-stone-400 text-xl">⚔️</span>
        <span className="text-stone-600 text-xs font-bold" style={{ fontFamily: "serif" }}>VS</span>
        <span className="text-stone-400 text-xl">⚔️</span>
      </div>

      {/* Monster card */}
      <div
        ref={monsterCardRef}
        className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-all duration-500 ${
          monsterDefeated ? "battle-card-defeated" : ""
        }`}
        style={{ borderColor: monsterDefeated ? "#44403c" : "#991b1b", minHeight: 140 }}
      >
        {!monsterImgError && monster.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={monster.imageUrl}
            alt={monster.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            onError={() => setMonsterImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
            <span className="text-4xl">👹</span>
          </div>
        )}
        {/* Colour tint */}
        {monster.color && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundColor: monster.color }} />
        )}
        {/* Name + HP overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1">
          <div className="text-xs font-bold text-red-200 truncate" style={{ fontFamily: "serif" }}>
            {monster.name}
          </div>
          <HpBar current={monsterHp} max={monster.maxHitPoints} />
        </div>
        {monsterDefeated && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">💀</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chronicle overlay ─────────────────────────────────────────────────────────
function ChronicleOverlay({
  heroWon,
  monsterWon,
  hero,
  monster,
  heroHp,
  monsterHp,
  isVisible,
  onClose,
  onReset,
  onNewBattle,
}: {
  heroWon: boolean;
  monsterWon: boolean;
  hero: Hero;
  monster: Monster;
  heroHp: number;
  monsterHp: number;
  isVisible: boolean;
  onClose: () => void;
  onReset: () => void;
  onNewBattle: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build the result text once
  const fullText = heroWon
    ? `After a fierce exchange, ${hero.name} emerges victorious with ${heroHp} HP remaining! ${monster.name} has been vanquished.`
    : monsterWon
    ? `${monster.name} proves too powerful — ${hero.name} has fallen in combat. ${monster.name} stands triumphant with ${monsterHp} HP remaining.`
    : `An extraordinary battle concludes in a draw. Both combatants survived the full engagement.`;

  // Reset typewriter whenever the overlay opens
  useEffect(() => {
    if (!isVisible) {
      setDisplayedText("");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setDisplayedText("");
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      setDisplayedText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 30);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Slide-in via CSS class
  useEffect(() => {
    if (!overlayRef.current) return;
    if (isVisible) {
      overlayRef.current.classList.add("battle-summary-visible");
    } else {
      overlayRef.current.classList.remove("battle-summary-visible");
    }
  }, [isVisible]);

  const victorName = heroWon ? hero.name : monster.name;
  const defeatedName = heroWon ? monster.name : hero.name;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        style={{
          opacity: isVisible ? 1 : 0,
          zIndex: 2100,
          pointerEvents: isVisible ? "auto" : "none",
        }}
      />

      {/* Parchment panel */}
      <div
        ref={overlayRef}
        className="battle-summary-overlay fixed right-0 top-0 h-full w-full max-w-lg overflow-y-auto"
        style={{ zIndex: 2101, pointerEvents: isVisible ? "auto" : "none" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg z-20"
          style={{ background: "rgba(92,64,51,0.85)", color: "#fef3c7" }}
          aria-label="Close chronicle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="parchment-paper min-h-full p-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h2
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: "serif", color: "#2A1810" }}
            >
              Battle Chronicle
            </h2>
            <p className="text-sm italic" style={{ color: "#4A2F1F" }}>
              {victorName} vs {defeatedName}
            </p>
          </div>

          <div className="parchment-divider" />

          {/* Victor banner */}
          <div
            className="rounded-lg p-3 text-center mb-6"
            style={{
              background: heroWon
                ? "rgba(34,197,94,0.15)"
                : monsterWon
                ? "rgba(220,38,38,0.15)"
                : "rgba(107,114,128,0.15)",
              border: `2px solid ${heroWon ? "#16a34a" : monsterWon ? "#dc2626" : "#6b7280"}`,
            }}
          >
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "serif", color: heroWon ? "#14532d" : monsterWon ? "#7f1d1d" : "#374151" }}
            >
              {heroWon ? "🏆 Victory!" : monsterWon ? "💀 Defeated!" : "⚖️ Draw!"}
            </div>
          </div>

          {/* Typewriter narrative */}
          <div className="prose max-w-none mb-8">
            <p
              className="text-lg leading-relaxed"
              style={{ fontFamily: "serif", color: "#3D2817", fontWeight: 500 }}
            >
              {displayedText}
              {displayedText.length < fullText.length && (
                <span
                  className="inline-block ml-0.5 align-text-bottom"
                  style={{
                    width: "2px",
                    height: "1.1em",
                    background: "linear-gradient(to bottom, transparent, #FF6B35, #FF8C42, #FF6B35, transparent)",
                    boxShadow: "0 0 8px #FF6B35",
                    animation: "fireFlicker 0.3s ease-in-out infinite alternate",
                  }}
                />
              )}
            </p>
          </div>

          <div className="parchment-divider" />

          {/* Actions */}
          <p
            className="text-center text-base italic mb-5"
            style={{ color: "#4A2F1F", fontFamily: "serif" }}
          >
            What will you do next?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onNewBattle}
              className="px-6 py-3 text-base font-bold rounded-lg border-2 transition-all shadow-md hover:shadow-lg"
              style={{
                fontFamily: "serif",
                backgroundColor: "#8B6F47",
                borderColor: "#6B4E3D",
                color: "#F2ECDE",
              }}
            >
              Next Battle?
            </button>
            <button
              onClick={onReset}
              className="px-6 py-3 text-base font-bold rounded-lg border-2 transition-all shadow-md hover:shadow-lg"
              style={{
                fontFamily: "serif",
                backgroundColor: "#A66D28",
                borderColor: "#8B5A1F",
                color: "#F2ECDE",
              }}
            >
              I think I&apos;m done.
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main arena ────────────────────────────────────────────────────────────────
export default function CombatArena({ hero, monster, onReset }: Props) {
  const [state, setState] = useState<CombatState>("idle");
  const [activeTab, setActiveTab] = useState<"log" | "chat">("log");
  const [allEntries, setAllEntries] = useState<CombatLogEntry[]>([]);
  const [displayedEntries, setDisplayedEntries] = useState<CombatLogEntry[]>([]);
  const [heroHp, setHeroHp] = useState(0);
  const [monsterHp, setMonsterHp] = useState(0);
  const [chronicleOpen, setChronicleOpen] = useState(false);

  // TASK-04: refs for BattleVisual DOM nodes (used by triggerCombatAnimation)
  const heroCardRef = useRef<HTMLDivElement>(null);
  const monsterCardRef = useRef<HTMLDivElement>(null);

  // Reset when combatants change
  useEffect(() => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    setHeroHp(hero?.hitPoints ?? 0);
    setMonsterHp(monster?.hitPoints ?? 0);
    setChronicleOpen(false);
  }, [hero, monster]);

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
        // TASK-05: fire card animations in sync with drip-feed
        if (hero) triggerCombatAnimation(last, hero.name, heroCardRef, monsterCardRef);
      }
      if (idx >= allEntries.length) {
        clearInterval(timer);
        setState("done");
        // Auto-open the chronicle after a brief beat
        setTimeout(() => setChronicleOpen(true), 400);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [allEntries, state]);

  const handleFight = async () => {
    if (!hero || !monster) return;
    setState("fighting");
    setDisplayedEntries([]);
    setAllEntries([]);
    setChronicleOpen(false);

    const [heroRes, monsterRes] = await Promise.all([
      fetch(`/api/heroes/${hero._id}`),
      fetch(`/api/monsters/${monster._id}`),
    ]);
    const { hero: freshHero } = (await heroRes.json()) as { hero: Hero };
    const { monster: freshMonster } = (await monsterRes.json()) as { monster: Monster };

    setHeroHp(freshHero.hitPoints);
    setMonsterHp(freshMonster.hitPoints);
    setAllEntries(runCombat(freshHero, freshMonster));
  };

  const handleReset = useCallback(() => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    setChronicleOpen(false);
    onReset();
  }, [onReset]);

  // "Next battle" keeps the log, just resets to idle for new selection
  const handleNewBattle = useCallback(() => {
    setChronicleOpen(false);
    handleReset();
  }, [handleReset]);

  const heroWon = state === "done" && heroHp > 0 && monsterHp <= 0;
  const monsterWon = state === "done" && monsterHp > 0 && heroHp <= 0;

  return (
    <>
      <div className="flex flex-col h-full" style={{ gap: "1rem", minHeight: 0 }}>
        {/* TASK-03/04: Battle visual — cards facing each other with animations */}
        {hero && monster && (
          <div className="shrink-0">
          <BattleVisual
            hero={hero}
            monster={monster}
            heroHp={heroHp}
            monsterHp={monsterHp}
            heroCardRef={heroCardRef}
            monsterCardRef={monsterCardRef}
            state={state}
          />
          </div>
        )}

        {/* Combatant stat cards */}
        <div className="flex gap-3 shrink-0">
          {hero ? (
            <StatCard character={hero} label="Hero" currentHp={heroHp} isHero />
          ) : (
            <div className="flex-1 rounded-lg p-3 text-sm text-stone-500 text-center border-2 border-dashed border-stone-600 bg-stone-800/30">
              Pick a hero →
            </div>
          )}
          <div className="flex items-center text-2xl text-stone-400 px-1">⚔️</div>
          {monster ? (
            <StatCard character={monster} label="Monster" currentHp={monsterHp} isHero={false} />
          ) : (
            <div className="flex-1 rounded-lg p-3 text-sm text-stone-500 text-center border-2 border-dashed border-stone-600 bg-stone-800/30">
              ← Pick a monster
            </div>
          )}
        </div>

        {/* Fight button */}
        {state === "idle" && (
          <button
            onClick={handleFight}
            disabled={!hero || !monster}
            className="shrink-0 w-full py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: !hero || !monster ? undefined : "linear-gradient(135deg,#92400e,#b45309)",
              color: "#fef3c7",
              border: "2px solid #78350f",
              fontFamily: "serif",
              letterSpacing: "0.05em",
            }}
          >
            ⚔️ Begin Battle!
          </button>
        )}

        {/* Fighting indicator */}
        {state === "fighting" && (
          <div className="text-center py-1 shrink-0" style={{ color: "#92400e", fontFamily: "serif" }}>
            <span className="font-bold italic">Combat in progress</span>
            <span className="waiting-indicator ml-2">
              <span className="waiting-dot" />
              <span className="waiting-dot" />
              <span className="waiting-dot" />
            </span>
          </div>
        )}

        {/* "View Chronicle" button once battle ends */}
        {state === "done" && (
          <button
            onClick={() => setChronicleOpen(true)}
            className="w-full py-2 rounded-xl font-bold transition-all shrink-0"
            style={{
              background: "linear-gradient(135deg,#5C4033,#78350f)",
              color: "#fef3c7",
              border: "2px solid #3b1f14",
              fontFamily: "serif",
            }}
          >
            📜 View Battle Chronicle
          </button>
        )}

        {/* Tab bar + content — fills remaining height */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Tab bar */}
        <div className="flex gap-1 shrink-0" style={{ borderBottom: "1px solid #292524" }}>
          {(["log", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 text-xs font-semibold tracking-wide rounded-t-lg transition-colors"
              style={{
                fontFamily: "serif",
                background: activeTab === tab ? "#1c1917" : "transparent",
                color: activeTab === tab ? "#fef3c7" : "#78716c",
                borderBottom: activeTab === tab ? "2px solid #b45309" : "2px solid transparent",
              }}
            >
              {tab === "log" ? "📜 Battle Log" : "💬 Chat"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0, minWidth: 0 }}>
          {activeTab === "log" ? (
            displayedEntries.length > 0 ? (
              <CombatLog
                entries={displayedEntries}
                heroName={hero?.name ?? ""}
                winner={
                  state === "done"
                    ? heroWon
                      ? hero?.name
                      : monsterWon
                      ? monster?.name
                      : undefined
                    : undefined
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: "#57534e" }}>
                {state === "idle" ? "No battle yet — pick a hero and monster to begin." : "Awaiting combat…"}
              </div>
            )
          ) : (
            <ChatPanel />
          )}
        </div>
        </div>{/* end tab wrapper */}
      </div>

      {/* Chronicle overlay */}
      {state === "done" && hero && monster && (
        <ChronicleOverlay
          heroWon={heroWon}
          monsterWon={monsterWon}
          hero={hero}
          monster={monster}
          heroHp={heroHp}
          monsterHp={monsterHp}
          isVisible={chronicleOpen}
          onClose={() => setChronicleOpen(false)}
          onReset={handleReset}
          onNewBattle={handleNewBattle}
        />
      )}
    </>
  );
}
