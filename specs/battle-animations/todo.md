# Battle Card Animations — Tasks

## Tasks

- [x] TASK-01: [CSS] Finalise all animation keyframes and utility classes in `src/app/globals.css`
- [x] TASK-02: [UI] Add `triggerCombatAnimation` helper function to `src/components/CombatArena.tsx`
- [x] TASK-03: [UI] Add `BattleVisual` component to `src/components/CombatArena.tsx`
- [x] TASK-04: [UI] Create `heroCardRef` / `monsterCardRef` refs in `CombatArena` and pass them to `BattleVisual`
- [x] TASK-05: [UI] Wire `triggerCombatAnimation` into the drip-feed `setInterval` in `CombatArena`
- [x] TASK-06: [UI] Apply `.battle-card-defeated` class conditionally in `BattleVisual` based on `heroHp` / `monsterHp` props
- [x] TASK-07: [verify] `npx tsc --noEmit` — zero errors; `npm run build` — clean ✓

## Deviations

- `RefObject<HTMLDivElement | null>` corrected to `RefObject<HTMLDivElement>` in both helper and component prop types to match React 18 legacy typing emitted by `useRef(null)`.

## Done when

- A fight plays out and every log entry triggers a visible lunge on the attacker card
- Hit entries shake the defender; miss entries wobble the attacker
- A flash glow appears on the attacker's facing edge on every hit
- Healing entries spawn green sparkles on the healer card
- Defeated combatant's card goes grayscale and tilted
- No TypeScript errors, no build errors
