# Battle Card Animations — Requirements

## User story

As a workshop attendee watching a fight play out, I want to see the hero and monster cards physically lunge, shake, flash, and crumple during combat so the battle feels alive rather than just a scrolling text log.

---

## Requirements

**REQ-001 — Battle visual panel**
- When combat is in progress (`state === "fighting"`) the arena shows two character card visuals facing each other (hero on left, monster on right)
- Cards remain visible for the entire playback, including after combat ends
- Acceptance: both cards are visible as soon as the fight button is clicked and remain until the user resets

**REQ-002 — Attacker lunge animation**
- Each time a log entry is drip-fed, the attacking card lunges toward the opponent (hero translates right, monster translates left)
- The lunge plays even on a miss
- Acceptance: every log entry triggers a visible forward motion on the attacker's card

**REQ-003 — Hit reaction on defender**
- When the attack hits (`entry.hit === true` and `entry.damage > 0`), the defending card plays a shake/impact animation
- Acceptance: no shake plays on a miss

**REQ-004 — Miss reaction on attacker**
- When the attack misses (`entry.hit === false`), the attacker plays a wobbly stumble animation instead of a clean lunge
- Acceptance: miss and hit produce visually distinct attacker animations

**REQ-005 — Flash effect on hit**
- On a hit, the attacker's card briefly flashes (bright glow on the edge facing the opponent) to signal energy leaving the card
- Acceptance: flash appears on the right edge of hero card and left edge of monster card when they land a hit

**REQ-006 — Healing sparkles**
- When a healing ability fires (`entry.healing != null`), the healing card shows rising green sparkle particles
- Acceptance: sparkles appear on whichever combatant healed themselves

**REQ-007 — Defeated card state**
- When a combatant reaches 0 HP the card immediately applies a defeated visual (grayscale, slight tilt, dim)
- Acceptance: defeated card looks visually distinct from a healthy card by the last log entry

**REQ-008 — Animations sync with drip-feed**
- Animations are triggered one at a time in sync with the existing 150 ms drip-feed timer, not all at once
- Acceptance: each log entry fires exactly one round of animations before the next entry fires

---

## Out of scope

- No floating damage numbers above cards
- No projectile/missile effects between cards
- No card zoom or full-screen view
- No sound effects
- No changes to the combat engine (`src/lib/combat.ts`)
- No changes to the combat log component (`src/components/CombatLog.tsx`)
- No changes to the StatCard HP bar UI (that stays in the existing header row)
