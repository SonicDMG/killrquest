# killrquest — Requirements

## User story

As a workshop attendee, I want to search for heroes and monsters by natural language, pick a hero, and fight a monster in a turn-by-turn combat simulator, so I can see how Astra powers both fuzzy semantic search and real-time stateful game logic in the same app.

---

## Requirements

### Search & Discovery

**REQ-001 — Hero search**
- User can type a natural language query (e.g. "powerful healer", "sneaky rogue") to search heroes
- Results are ranked by relevance using Astra lexical + rerank
- Acceptance: typing "nature magic healer" returns Thorn the Wild near the top

**REQ-002 — Monster search**
- User can type a natural language query (e.g. "fire demon", "undead spellcaster") to search monsters
- Results use the same lexical + rerank pipeline as heroes
- Acceptance: typing "undead spellcaster" returns Lich near the top

**REQ-003 — Browse all**
- User can browse the full hero and monster rosters without a search query
- Default view shows all available heroes/monsters (paginated if needed)

---

### Cards & Visuals

**REQ-004 — Hero card**
- Each hero displays: image, name, class, HP, AC, attack bonus, damage die, and abilities list
- Images load from the `imageUrl` field (GCS URLs)

**REQ-005 — Monster card**
- Each monster displays: image, name, HP, AC, attack bonus, damage die, and abilities list
- Monsters with local `/cdn/...` image paths show a fallback placeholder image

**REQ-006 — Selection state**
- Selected hero and selected monster are visually highlighted
- Only one hero and one monster can be selected at a time

---

### Combat

**REQ-007 — Start combat**
- A "Fight!" button is enabled only when both a hero and a monster are selected
- Clicking it starts a new combat session

**REQ-008 — Turn-by-turn combat loop**
- Combat alternates: hero attacks first, then monster
- Each attack: roll a d20 + attackBonus vs opponent's armorClass to hit; on hit roll damageDie for damage
- HP is tracked in local state (no writes back to Astra — read-only)
- Each turn produces a readable log line (e.g. "Sir Percival rolls 14+5=19 vs AC 18 — HIT! 7 damage")

**REQ-009 — Ability usage**
- Heroes and monsters with defined abilities may use one ability per turn instead of a basic attack
- Healing abilities restore HP (capped at maxHitPoints)
- Attack abilities use their own damageDice instead of the base damageDie

**REQ-010 — Combat end**
- Combat ends when either combatant reaches 0 HP
- A clear win/loss result is shown with the surviving combatant's remaining HP
- User can start a new fight (reset) without reloading the page

---

### Astra showcase (workshop narrative)

**REQ-011 — Visible data source**
- The UI shows which Astra collection each piece of data came from (`heroes` / `monsters`)
- Search queries and result counts are shown so the workshop can narrate what's happening

**REQ-012 — Live Astra reads during combat**
- At the start of each combat, hero and monster full documents are fetched fresh from Astra (not cached from the search results) to demonstrate OLTP point reads

---

## Out of scope

- No user authentication or sessions
- No writing HP changes back to Astra
- No multiplayer
- No deck building (that's the existing battle-arena app)
- No codebeasts integration
- No mobile-specific layout (desktop-first is fine for a workshop demo)
- No persistent combat history
- No sound effects
