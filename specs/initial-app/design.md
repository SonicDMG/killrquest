# killrquest — Design

## Overview

Next.js 14 app (App Router) + TypeScript. No local database. All data lives in two
Astra DB collections (`heroes`, `monsters`) accessed via the Data API over HTTP.
Combat state lives entirely in React state — no persistence.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Astra client | `@datastax/astra-db-ts` |
| LLM/embeddings | none — lexical + NVIDIA rerank already configured on the collections |

No vector embeddings needed in the app — the `heroes` and `monsters` collections already
have `lexical: enabled` and `rerank: nvidia/llama-3.2-nv-rerankqa-1b-v2` configured.
We use `sort: { $lexical: query }` for search, which triggers the reranker automatically.

---

## Environment variables

```
# .env.local
ASTRA_DB_ENDPOINT=https://5001b9e5-1007-4467-83be-28057ca4d044-us-east-2.apps.astra.datastax.com
ASTRA_DB_TOKEN=AstraCS:your_token_here
ASTRA_DB_KEYSPACE=default_keyspace
```

---

## Data types (`src/lib/types.ts`)

```ts
export interface Ability {
  name: string;
  type: "attack" | "healing";
  damageDice?: string;       // e.g. "1d4", "2d8"
  healingDice?: string;
  attackRoll?: boolean;
  description: string;
}

export interface Hero {
  _id: string;
  name: string;
  class?: string;
  hitPoints: number;
  maxHitPoints: number;
  armorClass: number;
  attackBonus: number;
  damageDie: string;         // e.g. "d8"
  abilities: Ability[];
  description: string;
  imageUrl: string;
  imagePosition?: { offsetX: number; offsetY: number };
  color?: string;
  isDefault?: boolean;
}

export interface Monster {
  _id: string;
  name: string;
  hitPoints: number;
  maxHitPoints: number;
  armorClass: number;
  attackBonus: number;
  damageDie: string;
  abilities: Ability[];
  description: string;
  imageUrl: string;
  imagePosition?: { offsetX: number; offsetY: number };
  color?: string;
}

export interface CombatLogEntry {
  turn: number;
  attacker: string;
  target: string;
  roll: number;
  total: number;
  ac: number;
  hit: boolean;
  damage?: number;
  healing?: number;
  abilityUsed?: string;
  resultHp: { hero: number; monster: number };
}
```

---

## Astra client (`src/lib/astra.ts`)

Singleton client. Exports typed collection handles.

```ts
import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN!);
const db = client.db(process.env.ASTRA_DB_ENDPOINT!, {
  keyspace: process.env.ASTRA_DB_KEYSPACE ?? "default_keyspace",
});

export const heroesCollection = db.collection<Hero>("heroes");
export const monstersCollection = db.collection<Monster>("monsters");
```

---

## API routes

All routes are Next.js Route Handlers under `src/app/api/`. All export
`export const runtime = "nodejs"`.

### `GET /api/heroes?q=<query>`

- If `q` is present: `collection.find({}, { sort: { $lexical: q }, limit: 20 })`
- If `q` is absent: `collection.find({}, { limit: 30 })` (browse all)
- Returns `{ heroes: Hero[], query: string | null, count: number }`

### `GET /api/monsters?q=<query>`

- Same pattern as heroes
- Returns `{ monsters: Monster[], query: string | null, count: number }`

### `GET /api/heroes/:id`

- `collection.findOne({ _id: id })`
- Returns `{ hero: Hero }` or 404
- Used by REQ-012 (fresh point-read at combat start)

### `GET /api/monsters/:id`

- Same pattern
- Returns `{ monster: Monster }` or 404

---

## UI layout (`src/app/page.tsx`)

Single page. Three columns on desktop:

```
┌─────────────────┬──────────────────┬─────────────────┐
│   HERO ROSTER   │    COMBAT LOG    │ MONSTER ROSTER  │
│                 │                  │                 │
│  [search bar]   │  [fight button]  │  [search bar]   │
│  [hero cards]   │  [log entries]   │ [monster cards] │
│                 │  [result banner] │                 │
└─────────────────┴──────────────────┴─────────────────┘
```

- Left column: hero search + cards. Selected hero highlighted with a ring.
- Right column: monster search + cards. Selected monster highlighted.
- Center column: combat arena. Shows selected combatant stat summaries at top,
  Fight! button, scrollable log, win/loss banner.

---

## Component breakdown

### `src/components/SearchBar.tsx`
- Controlled input with debounce (300ms)
- Shows "X results from `heroes`" / "X results from `monsters`" below input (REQ-011)
- Props: `collection: "heroes" | "monsters"`, `onResults`, `placeholder`

### `src/components/CharacterCard.tsx`
- Used for both heroes and monsters (unified card)
- Props: `character: Hero | Monster`, `selected: boolean`, `onClick`
- Image with `object-cover`, fallback to a gray placeholder div if image 404s
- Stat row: HP / AC / ATK / die
- Abilities listed as small badges
- Color tint from `character.color` (Tailwind bg class)

### `src/components/CombatArena.tsx`
- Receives: `hero: Hero | null`, `monster: Monster | null`, `onFight`
- Shows mini stat cards for selected hero + monster (or "Pick a hero / Pick a monster" prompts)
- Fight! button — disabled when either is null or combat is in progress
- After fight: scrollable `<CombatLog>` + result banner + Reset button

### `src/components/CombatLog.tsx`
- Renders `CombatLogEntry[]` as a scrollable list
- Each entry: coloured badge (hero/monster), hit/miss indicator, damage number
- Auto-scrolls to bottom on new entries

---

## Combat engine (`src/lib/combat.ts`)

Pure functions, no I/O. Deterministic given a seed (or just Math.random for demo purposes).

```ts
// Roll an N-sided die
function rollDie(sides: number): number

// Parse "2d8", "d6", "1d4" → { count, sides }
function parseDice(expr: string): { count: number; sides: number }

// Roll a full dice expression and return total
function rollDice(expr: string): number

// Resolve one attack: returns { hit, damage, roll, total }
function resolveAttack(attackBonus: number, ac: number, damageDie: string): AttackResult

// Pick which ability to use this turn (simple heuristic):
//   - If HP < 30% of max and a healing ability exists → use healing
//   - Otherwise pick a random attack ability if any, else basic attack
function pickAbility(combatant: Hero | Monster, currentHp: number): Ability | null

// Run one full turn (attacker → defender), returns CombatLogEntry
export function resolveTurn(
  turn: number,
  attacker: Hero | Monster,
  attackerHp: number,
  defender: Hero | Monster,
  defenderHp: number,
  attackerIsHero: boolean,
): CombatLogEntry

// Run a full combat to completion, returns all log entries
export function runCombat(hero: Hero, monster: Monster): CombatLogEntry[]
```

Combat is resolved all at once (`runCombat`) and the log is replayed in the UI with
a short delay between entries (150ms setTimeout) for dramatic effect.

---

## Combat flow (REQ-007 → REQ-012)

1. User clicks Fight!
2. `CombatArena` calls `GET /api/heroes/:id` and `GET /api/monsters/:id` in parallel
   (fresh Astra point-reads — REQ-012)
3. `runCombat(hero, monster)` executes fully synchronously, returns `CombatLogEntry[]`
4. Entries are drip-fed into displayed log at 150ms intervals
5. When all entries are replayed, show win/loss banner
6. Reset clears selection and log

---

## Image handling

- GCS URLs (`https://storage.googleapis.com/...`) → render directly in `<img>`
- Local paths (`/cdn/...`) → these are from the original battle-arena app and won't
  resolve here. `CharacterCard` uses `onError` to swap to a styled placeholder.
- All images rendered with `unoptimized` prop if using `next/image`, or plain `<img>`
  with `object-cover` and explicit dimensions.

---

## Project bootstrap

```
npx create-next-app@latest killrquest \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*"
# Then move into src/ structure manually or use --src-dir
npm install @datastax/astra-db-ts
```

Actual structure:
```
killrquest/
  src/
    app/
      page.tsx
      layout.tsx
      globals.css
      api/
        heroes/
          route.ts
          [id]/
            route.ts
        monsters/
          route.ts
          [id]/
            route.ts
    components/
      SearchBar.tsx
      CharacterCard.tsx
      CombatArena.tsx
      CombatLog.tsx
    lib/
      astra.ts
      types.ts
      combat.ts
  specs/
  .env.local
```

---

## REQ coverage

| REQ | Design item |
|-----|-------------|
| REQ-001 | `GET /api/heroes?q=` with `$lexical` sort + rerank |
| REQ-002 | `GET /api/monsters?q=` with `$lexical` sort + rerank |
| REQ-003 | Same routes with no `q` param, `find({}, {limit:30})` |
| REQ-004 | `CharacterCard` — hero fields |
| REQ-005 | `CharacterCard` — monster fields + `onError` placeholder |
| REQ-006 | `selected` prop on `CharacterCard`, ring styling |
| REQ-007 | Fight! button in `CombatArena`, disabled guard |
| REQ-008 | `combat.ts` — `resolveTurn`, `runCombat`, log lines |
| REQ-009 | `combat.ts` — `pickAbility`, healing/attack branch |
| REQ-010 | Win/loss banner + Reset button in `CombatArena` |
| REQ-011 | `SearchBar` result count label with collection name |
| REQ-012 | Fresh `GET /api/heroes/:id` + `/api/monsters/:id` on Fight! |
