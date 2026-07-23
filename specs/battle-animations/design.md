# Battle Card Animations — Design

## Overview

All changes are confined to two files:

1. **`src/app/globals.css`** — animation keyframes and utility classes (already partially added; will be finalised here)
2. **`src/components/CombatArena.tsx`** — new `BattleVisual` component + animation state wired into the drip-feed loop

No new files, no new routes, no changes to `combat.ts`, `CombatLog.tsx`, or any type definitions.

---

## Animation classes (globals.css)

Six CSS utility classes drive all visual effects. They are applied and removed via `useRef` + direct DOM class manipulation (same pattern used by the reference repo) to avoid React re-render overhead during the tight 150 ms drip-feed loop.

| Class | Applied to | Effect |
|---|---|---|
| `.battle-hit-hero` | hero card wrapper | Scale-up + translateX right (lunge toward monster) |
| `.battle-hit-monster` | monster card wrapper | Scale-up + translateX left (lunge toward hero) |
| `.battle-shake` | defender card wrapper | Rapid horizontal shake |
| `.battle-miss` | attacker card wrapper | Wobbly opacity/rotate stumble |
| `.battle-flash-right` | `<div>` injected inside hero card | Bright right-edge glow (hero attacks) |
| `.battle-flash-left` | `<div>` injected inside monster card | Bright left-edge glow (monster attacks) |
| `.battle-sparkle-particle` | `<div>` injected inside healer card | Rising green particle, multiple instances |
| `.battle-card-defeated` | defeated card wrapper | Grayscale + tilt, transition-based (not keyframed) |

Animation durations:
- Lunge (`hit-hero` / `hit-monster`): 550 ms
- Shake: 450 ms
- Miss: 550 ms
- Flash: 450 ms (auto-removes via `animationend`)
- Sparkle: 750 ms (auto-removes via `animationend`)

---

## `BattleVisual` component (CombatArena.tsx)

### What it renders

```
┌──────────────────────────────────────────────┐
│  [Hero Card]   ⚔️ VS ⚔️   [Monster Card]     │
│   image + name + HP bar                      │
└──────────────────────────────────────────────┘
```

Sits between the existing `StatCard` header row and the Fight button / combat log. Visible whenever `hero && monster` (i.e. both combatants are selected), not just during fighting.

### Internal structure

```tsx
<div className="flex gap-4 items-center justify-center">
  <div ref={heroCardRef} className="relative flex-1 ...">
    {/* hero image */}
    {/* flash div injected here via DOM */}
    {/* sparkle divs injected here via DOM */}
  </div>
  <div className="text-stone-400 text-2xl">⚔️</div>
  <div ref={monsterCardRef} className="relative flex-1 ...">
    {/* monster image */}
    {/* flash/sparkle divs injected here via DOM */}
  </div>
</div>
```

Each card shows:
- Character image (or ⚔️ fallback) — `object-cover`, fixed height ~120px
- Name label
- Inline HP bar (same `HpBar` component already in the file)

### Animation state

No new React state. Animation is driven by **two `useRef` handles** passed down from `CombatArena`:

```ts
heroCardRef:    React.RefObject<HTMLDivElement>
monsterCardRef: React.RefObject<HTMLDivElement>
```

### How animations are triggered

Inside the existing drip-feed `setInterval` in `CombatArena`, immediately after advancing `idx`, call `triggerCombatAnimation(entry, heroName, heroCardRef, monsterCardRef)`.

#### `triggerCombatAnimation` (local helper function, same file)

```ts
function triggerCombatAnimation(
  entry: CombatLogEntry,
  heroName: string,
  heroRef: React.RefObject<HTMLDivElement>,
  monsterRef: React.RefObject<HTMLDivElement>
): void
```

Logic:

```
attackerIsHero = entry.attacker === heroName

attackerEl = attackerIsHero ? heroRef.current : monsterRef.current
defenderEl = attackerIsHero ? monsterRef.current : heroRef.current

if entry.healing != null:
  inject sparkle divs into attackerEl (5 particles at random offsets)
  each div removes itself on animationend
  return

if entry.hit:
  add .battle-hit-hero or .battle-hit-monster to attackerEl (depends on side)
  add .battle-shake to defenderEl
  inject .battle-flash-right (hero) or .battle-flash-left (monster) div into attackerEl
  flash div removes itself on animationend
  remove lunge class after 600 ms
  remove shake class after 500 ms
else:  // miss
  add .battle-miss to attackerEl
  remove after 600 ms
```

Class removal is done with `setTimeout` matching the animation duration + a small buffer (50 ms). This is the same pattern used in the reference repo's `useCardAnimations` hook.

---

## Drip-feed integration

Current drip-feed loop (lines 294–314 of `CombatArena.tsx`):

```ts
const timer = setInterval(() => {
  idx++;
  const slice = allEntries.slice(0, idx);
  setDisplayedEntries(slice);
  const last = slice[slice.length - 1];
  if (last) {
    setHeroHp(last.resultHp.hero);
    setMonsterHp(last.resultHp.monster);
  }
  if (idx >= allEntries.length) { clearInterval(timer); setState("done"); ... }
}, 150);
```

Add one line after the `if (last)` block:

```ts
if (last) triggerCombatAnimation(last, hero.name, heroCardRef, monsterCardRef);
```

---

## Defeated card

In `BattleVisual`, the card wrapper `className` includes `battle-card-defeated` conditionally:

```tsx
className={`... ${heroHp <= 0 && state !== "idle" ? "battle-card-defeated" : ""}`}
```

Since `heroHp` / `monsterHp` are React state already flowing down as props, this is a pure CSS class toggle — no extra state needed.

---

## REQ coverage

| REQ-ID | Design item |
|--------|------------|
| REQ-001 | `BattleVisual` renders when `hero && monster`, persists through end state |
| REQ-002 | `triggerCombatAnimation` — always applies lunge class on attacker |
| REQ-003 | `triggerCombatAnimation` — shake applied to defender only when `entry.hit` |
| REQ-004 | `triggerCombatAnimation` — `.battle-miss` branch when `!entry.hit` |
| REQ-005 | Flash div injected into attacker card on hit |
| REQ-006 | Sparkle divs injected into healer card when `entry.healing != null` |
| REQ-007 | `.battle-card-defeated` CSS class toggled via `heroHp`/`monsterHp` props |
| REQ-008 | `triggerCombatAnimation` called inside the existing `setInterval` drip-feed |
