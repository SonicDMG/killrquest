"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Hero, Monster, CombatLogEntry, ConversationDoc, Provider } from "@/lib/types";
import { runRosterCombat } from "@/lib/combat";
import CombatLog from "./CombatLog";
import ChatPanel from "./ChatPanel";
import ConversationList from "./ConversationList";
import ImagePanContainer from "./ImagePanContainer";

// ── TASK-02: triggerCombatAnimation ──────────────────────────────────────────
function triggerCombatAnimation(
  entry: CombatLogEntry,
  heroNames: string[],
  heroRefs: React.RefObject<HTMLDivElement>[],
  monsterRefs: React.RefObject<HTMLDivElement>[]
): void {
  const attackerRefs = entry.attackerIsHero ? heroRefs : monsterRefs;
  const defenderRefs = entry.attackerIsHero ? monsterRefs : heroRefs;
  const attackerEl = attackerRefs[entry.attackerIdx]?.current;
  const defenderEl = defenderRefs[entry.targetIdx]?.current;
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
    const lungeClass = entry.attackerIsHero ? "battle-hit-hero" : "battle-hit-monster";
    attackerEl.classList.add(lungeClass);
    setTimeout(() => attackerEl.classList.remove(lungeClass), 600);

    defenderEl.classList.add("battle-shake");
    setTimeout(() => defenderEl.classList.remove("battle-shake"), 500);

    const flash = document.createElement("div");
    flash.className = entry.attackerIsHero ? "battle-flash-right" : "battle-flash-left";
    attackerEl.appendChild(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  } else {
    attackerEl.classList.add("battle-miss");
    setTimeout(() => attackerEl.classList.remove("battle-miss"), 600);
  }
}

interface Props {
  heroes: Hero[];
  monsters: Monster[];
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

// ── Combatant card in the visual panel ────────────────────────────────────────
function CombatantCard({
  character,
  currentHp,
  isHero,
  cardRef,
  state,
}: {
  character: Hero | Monster;
  currentHp: number;
  isHero: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  state: CombatState;
}) {
  const defeated = state !== "idle" && currentHp <= 0;
  const collection = isHero ? "heroes" : "monsters";

  const handleCommit = useCallback((x: number, y: number) => {
    fetch(`/api/${collection}/${character._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePositionWide: { offsetX: x, offsetY: y } }),
    }).catch(() => {});
  }, [character._id, collection]);

  return (
    <div
      ref={cardRef}
      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-500 ${
        defeated ? "battle-card-defeated" : ""
      }`}
      style={{
        borderColor: defeated ? "#44403c" : isHero ? "#92400e" : "#991b1b",
        minHeight: 100,
        flex: "1 1 0",
        minWidth: 0,
      }}
    >
      <ImagePanContainer
        imgSrc={character.imageUrl}
        imgAlt={character.name}
        offsetX={character.imagePositionWide?.offsetX ?? character.imagePosition?.offsetX ?? 50}
        offsetY={character.imagePositionWide?.offsetY ?? 0}
        onCommit={handleCommit}
        flipX={!isHero}
        className="absolute inset-0 w-full h-full"
      >
        {/* Color tint */}
        {character.color && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundColor: character.color }} />
        )}
        {/* Name + HP overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1 pointer-events-none">
          <div
            className="text-xs font-bold truncate"
            style={{ color: isHero ? "#fde68a" : "#fca5a5", fontFamily: "serif" }}
          >
            {character.name}
          </div>
          <HpBar current={currentHp} max={character.maxHitPoints} />
          <div className="text-xs font-mono text-white/70">
            {currentHp}/{character.maxHitPoints}
          </div>
        </div>
        {defeated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl">💀</span>
          </div>
        )}
      </ImagePanContainer>
    </div>
  );
}

// ── BattleVisual: two rows of cards (heroes vs monsters) ─────────────────────
function BattleVisual({
  heroes,
  monsters,
  heroHps,
  monsterHps,
  heroRefs,
  monsterRefs,
  state,
}: {
  heroes: Hero[];
  monsters: Monster[];
  heroHps: number[];
  monsterHps: number[];
  heroRefs: React.RefObject<HTMLDivElement>[];
  monsterRefs: React.RefObject<HTMLDivElement>[];
  state: CombatState;
}) {
  return (
    <div className="space-y-2">
      {/* Heroes row */}
      <div className="flex gap-2">
        {heroes.map((h, i) => (
          <CombatantCard
            key={h._id}
            character={h}
            currentHp={heroHps[i] ?? 0}
            isHero
            cardRef={heroRefs[i]}
            state={state}
          />
        ))}
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex-1 h-px" style={{ background: "#44403c" }} />
        <span className="text-stone-500 text-xs font-bold px-2" style={{ fontFamily: "serif" }}>⚔️ VS ⚔️</span>
        <div className="flex-1 h-px" style={{ background: "#44403c" }} />
      </div>

      {/* Monsters row */}
      <div className="flex gap-2">
        {monsters.map((m, i) => (
          <CombatantCard
            key={m._id}
            character={m}
            currentHp={monsterHps[i] ?? 0}
            isHero={false}
            cardRef={monsterRefs[i]}
            state={state}
          />
        ))}
      </div>
    </div>
  );
}

// ── Stat summary bar ──────────────────────────────────────────────────────────
function StatRow({
  characters,
  hps,
  isHero,
}: {
  characters: (Hero | Monster)[];
  hps: number[];
  isHero: boolean;
}) {
  if (characters.length === 0) {
    return (
      <div className="flex-1 rounded-lg p-3 text-sm text-stone-500 text-center border-2 border-dashed border-stone-600 bg-stone-800/30">
        {isHero ? "Pick heroes →" : "← Pick monsters"}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 flex-1">
      {characters.map((c, i) => (
        <div
          key={c._id}
          className="flex-1 rounded-lg p-2 text-xs space-y-0.5 border-2"
          style={{
            minWidth: 90,
            background: isHero
              ? "linear-gradient(135deg,#fdf8f0 0%,#f5edd8 100%)"
              : "linear-gradient(135deg,#fdf0f0 0%,#f5d8d8 100%)",
            borderColor: isHero ? "#92400e" : "#991b1b",
          }}
        >
          <div
            className="font-bold text-stone-800 truncate"
            style={{ fontFamily: "serif", fontSize: "0.7rem" }}
          >
            {c.name}
          </div>
          <HpBar current={hps[i] ?? 0} max={c.maxHitPoints} />
          <div className="flex gap-1.5 text-stone-600 font-mono" style={{ fontSize: "0.65rem" }}>
            <span>❤️ {hps[i] ?? 0}/{c.maxHitPoints}</span>
            <span>🛡️ {c.armorClass}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chronicle overlay ─────────────────────────────────────────────────────────
function ChronicleOverlay({
  heroesWon,
  monstersWon,
  heroes,
  monsters,
  heroHps,
  monsterHps,
  isVisible,
  onClose,
  onReset,
  onNewBattle,
}: {
  heroesWon: boolean;
  monstersWon: boolean;
  heroes: Hero[];
  monsters: Monster[];
  heroHps: number[];
  monsterHps: number[];
  isVisible: boolean;
  onClose: () => void;
  onReset: () => void;
  onNewBattle: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const heroNames = heroes.map((h) => h.name);
  const monsterNames = monsters.map((m) => m.name);
  const heroSide = heroNames.length === 1 ? heroNames[0] : `the heroes (${heroNames.join(", ")})`;
  const monsterSide = monsterNames.length === 1 ? monsterNames[0] : `the monsters (${monsterNames.join(", ")})`;

  const survivors = heroesWon
    ? heroes.filter((_, i) => (heroHps[i] ?? 0) > 0).map((h) => h.name)
    : monsters.filter((_, i) => (monsterHps[i] ?? 0) > 0).map((m) => m.name);

  const fullText = heroesWon
    ? `After a fierce battle, ${heroSide} triumph over ${monsterSide}! ${
        survivors.length > 0 && survivors.length < heroes.length
          ? `${survivors.join(" and ")} survived the ordeal.`
          : "The party stands victorious!"
      }`
    : monstersWon
    ? `${monsterSide} prove too powerful — ${heroSide} ${heroes.length > 1 ? "have" : "has"} fallen. ${
        survivors.length > 0 && survivors.length < monsters.length
          ? `${survivors.join(" and ")} remain standing.`
          : "The monsters stand triumphant."
      }`
    : `An extraordinary battle concludes in a draw. Both sides survived the full engagement.`;

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

  useEffect(() => {
    if (!overlayRef.current) return;
    if (isVisible) {
      overlayRef.current.classList.add("battle-summary-visible");
    } else {
      overlayRef.current.classList.remove("battle-summary-visible");
    }
  }, [isVisible]);

  const victorSide = heroesWon ? heroSide : monsterSide;
  const defeatedSide = heroesWon ? monsterSide : heroSide;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        style={{
          opacity: isVisible ? 1 : 0,
          zIndex: 2100,
          pointerEvents: isVisible ? "auto" : "none",
        }}
      />

      <div
        ref={overlayRef}
        className="battle-summary-overlay fixed right-0 top-0 h-full w-full max-w-lg overflow-y-auto"
        style={{ zIndex: 2101, pointerEvents: isVisible ? "auto" : "none" }}
      >
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
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: "serif", color: "#2A1810" }}>
              Battle Chronicle
            </h2>
            <p className="text-sm italic" style={{ color: "#4A2F1F" }}>
              {victorSide} vs {defeatedSide}
            </p>
          </div>

          <div className="parchment-divider" />

          <div
            className="rounded-lg p-3 text-center mb-6"
            style={{
              background: heroesWon
                ? "rgba(34,197,94,0.15)"
                : monstersWon
                ? "rgba(220,38,38,0.15)"
                : "rgba(107,114,128,0.15)",
              border: `2px solid ${heroesWon ? "#16a34a" : monstersWon ? "#dc2626" : "#6b7280"}`,
            }}
          >
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "serif", color: heroesWon ? "#14532d" : monstersWon ? "#7f1d1d" : "#374151" }}
            >
              {heroesWon ? "🏆 Victory!" : monstersWon ? "💀 Defeated!" : "⚖️ Draw!"}
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <p className="text-lg leading-relaxed" style={{ fontFamily: "serif", color: "#3D2817", fontWeight: 500 }}>
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

          <p className="text-center text-base italic mb-5" style={{ color: "#4A2F1F", fontFamily: "serif" }}>
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

// ── Ref array helpers ─────────────────────────────────────────────────────────
function useRefArray(count: number) {
  const refs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  // Grow / shrink the array to match count
  while (refs.current.length < count) {
    refs.current.push({ current: null });
  }
  refs.current.length = count;
  return refs.current;
}

// ── Main arena ────────────────────────────────────────────────────────────────
export default function CombatArena({ heroes, monsters, onReset }: Props) {
  const [state, setState] = useState<CombatState>("idle");
  const [activeTab, setActiveTab] = useState<"log" | "chat">("log");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [allEntries, setAllEntries] = useState<CombatLogEntry[]>([]);
  const [displayedEntries, setDisplayedEntries] = useState<CombatLogEntry[]>([]);
  const [heroHps, setHeroHps] = useState<number[]>([]);
  const [monsterHps, setMonsterHps] = useState<number[]>([]);
  const [chronicleOpen, setChronicleOpen] = useState(false);

  const heroRefs = useRefArray(heroes.length);
  const monsterRefs = useRefArray(monsters.length);

  const refreshConversations = useCallback(() => {
    fetch("/api/agent/conversations")
      .then((r) => r.json())
      .then((data: { conversations: ConversationDoc[] }) => {
        setConversations(data.conversations ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  // Re-fetch conversation list whenever the chat tab is opened
  useEffect(() => {
    if (activeTab === "chat") refreshConversations();
  }, [activeTab, refreshConversations]);

  const handleConversationCreated = useCallback((
    id: string,
    meta: { provider: Provider; model: string; label: string }
  ) => {
    const optimistic: ConversationDoc = {
      _id: id,
      createdAt: new Date().toISOString(),
      label: meta.label,
      provider: meta.provider,
      model: meta.model,
    };
    setConversations((prev) => [optimistic, ...prev]);
    setActiveConversationId(id);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c._id !== id));
    setActiveConversationId((prev) => (prev === id ? null : prev));
    fetch(`/api/agent/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  // Reset when combatants change
  useEffect(() => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    setHeroHps(heroes.map((h) => h.hitPoints));
    setMonsterHps(monsters.map((m) => m.hitPoints));
    setChronicleOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Use serialised IDs so this only fires when the actual roster membership changes
    heroes.map((h) => h._id).join(","),
    monsters.map((m) => m._id).join(","),
  ]);

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
        setHeroHps([...last.resultHp.heroes]);
        setMonsterHps([...last.resultHp.monsters]);
        triggerCombatAnimation(last, heroes.map((h) => h.name), heroRefs, monsterRefs);
      }
      if (idx >= allEntries.length) {
        clearInterval(timer);
        setState("done");
        setTimeout(() => setChronicleOpen(true), 400);

        // Save battle record (fire-and-forget)
        if (heroes.length > 0 && monsters.length > 0) {
          const finalHp = allEntries[allEntries.length - 1]?.resultHp ?? { heroes: [], monsters: [] };
          const heroesAlive = finalHp.heroes.some((hp) => hp > 0);
          const monstersAlive = finalHp.monsters.some((hp) => hp > 0);
          const winner: "heroes" | "monsters" | "draw" =
            heroesAlive && !monstersAlive ? "heroes"
            : monstersAlive && !heroesAlive ? "monsters"
            : "draw";
          const abilitiesUsed = Array.from(
            new Set(allEntries.map((e) => e.abilityUsed).filter(Boolean) as string[])
          );
          const heroNames = heroes.map((h) => h.name).join(", ");
          const monsterNames = monsters.map((m) => m.name).join(", ");
          fetch("/api/battles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              heroes: heroNames,
              monsters: monsterNames,
              winner,
              turns: Math.ceil(allEntries.length / (heroes.length + monsters.length)),
              abilitiesUsed,
            }),
          }).catch(() => {/* non-critical */});
        }
      }
    }, 150);
    return () => clearInterval(timer);
  // heroRefs / monsterRefs are stable ref arrays — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, state]);

  const handleFight = async () => {
    if (heroes.length === 0 || monsters.length === 0) return;
    setState("fighting");
    setDisplayedEntries([]);
    setAllEntries([]);
    setChronicleOpen(false);

    // Fetch fresh copies of all combatants in parallel
    const [heroResults, monsterResults] = await Promise.all([
      Promise.all(heroes.map((h) => fetch(`/api/heroes/${h._id}`).then((r) => r.json() as Promise<{ hero: Hero }>))),
      Promise.all(monsters.map((m) => fetch(`/api/monsters/${m._id}`).then((r) => r.json() as Promise<{ monster: Monster }>))),
    ]);

    const freshHeroes = heroResults.map((r) => r.hero);
    const freshMonsters = monsterResults.map((r) => r.monster);

    setHeroHps(freshHeroes.map((h) => h.hitPoints));
    setMonsterHps(freshMonsters.map((m) => m.hitPoints));
    setAllEntries(runRosterCombat(freshHeroes, freshMonsters));
  };

  const handleReset = useCallback(() => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    setChronicleOpen(false);
    onReset();
  }, [onReset]);

  const handleNewBattle = useCallback(() => {
    setState("idle");
    setDisplayedEntries([]);
    setAllEntries([]);
    setChronicleOpen(false);
  }, []);

  const heroesWon = state === "done" && heroHps.some((hp) => hp > 0) && monsterHps.every((hp) => hp <= 0);
  const monstersWon = state === "done" && monsterHps.some((hp) => hp > 0) && heroHps.every((hp) => hp <= 0);

  const hasHeroes = heroes.length > 0;
  const hasMonsters = monsters.length > 0;

  return (
    <>
      <div className="flex flex-col h-full" style={{ gap: "1rem", minHeight: 0 }}>

        {/* Battle visual */}
        {hasHeroes && hasMonsters && (
          <div className="shrink-0">
            <BattleVisual
              heroes={heroes}
              monsters={monsters}
              heroHps={heroHps}
              monsterHps={monsterHps}
              heroRefs={heroRefs}
              monsterRefs={monsterRefs}
              state={state}
            />
          </div>
        )}

        {/* Stat summary row */}
        <div className="flex gap-3 shrink-0">
          <StatRow characters={heroes} hps={heroHps} isHero />
          <div className="flex items-center text-2xl text-stone-400 px-1 shrink-0">⚔️</div>
          <StatRow characters={monsters} hps={monsterHps} isHero={false} />
        </div>

        {/* Fight button */}
        {state === "idle" && (
          <button
            onClick={handleFight}
            disabled={!hasHeroes || !hasMonsters}
            className="shrink-0 w-full py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: !hasHeroes || !hasMonsters ? undefined : "linear-gradient(135deg,#92400e,#b45309)",
              color: "#fef3c7",
              border: "2px solid #78350f",
              fontFamily: "serif",
              letterSpacing: "0.05em",
            }}
          >
            {!hasHeroes && !hasMonsters
              ? "Pick heroes & monsters to begin"
              : !hasHeroes
              ? "Pick at least one hero"
              : !hasMonsters
              ? "Pick at least one monster"
              : `⚔️ Begin Battle! (${heroes.length}v${monsters.length})`}
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

        {/* Tab bar + content */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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

          <div className="flex-1 overflow-hidden" style={{ minHeight: 0, minWidth: 0 }}>
            {activeTab === "log" ? (
              displayedEntries.length > 0 ? (
                <CombatLog
                  entries={displayedEntries}
                  heroNames={heroes.map((h) => h.name)}
                  winner={
                    state === "done"
                      ? heroesWon
                        ? "Heroes"
                        : monstersWon
                        ? "Monsters"
                        : undefined
                      : undefined
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm" style={{ color: "#57534e" }}>
                  {state === "idle" ? "No battle yet — pick heroes and monsters to begin." : "Awaiting combat…"}
                </div>
              )
            ) : (
              <div className="flex h-full" style={{ minHeight: 0 }}>
                <div className="shrink-0" style={{ height: "100%", width: "200px", minWidth: "200px" }}>
                  <ConversationList
                    conversations={conversations}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                    onNew={handleNewConversation}
                    onDelete={handleDeleteConversation}
                  />
                </div>
                <div className="flex-1" style={{ height: "100%", minHeight: 0 }}>
                  <ChatPanel
                      activeConversationId={activeConversationId}
                      onConversationCreated={handleConversationCreated}
                      onStreamEnd={refreshConversations}
                    />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chronicle overlay */}
      {state === "done" && heroes.length > 0 && monsters.length > 0 && (
        <ChronicleOverlay
          heroesWon={heroesWon}
          monstersWon={monstersWon}
          heroes={heroes}
          monsters={monsters}
          heroHps={heroHps}
          monsterHps={monsterHps}
          isVisible={chronicleOpen}
          onClose={() => setChronicleOpen(false)}
          onReset={handleReset}
          onNewBattle={handleNewBattle}
        />
      )}
    </>
  );
}
