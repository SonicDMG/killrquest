# killrquest — Task List

## Tasks

- [ ] TASK-01: [scaffold] Bootstrap Next.js 14 app with TypeScript + Tailwind in `~/killrquest`, install `@datastax/astra-db-ts`
- [ ] TASK-02: [scaffold] Create `.env.local` with Astra endpoint, token, and keyspace
- [ ] TASK-03: [lib] Create `src/lib/types.ts` — `Hero`, `Monster`, `Ability`, `CombatLogEntry` interfaces
- [ ] TASK-04: [lib] Create `src/lib/astra.ts` — singleton `DataAPIClient`, export `heroesCollection` and `monstersCollection`
- [ ] TASK-05: [lib] Create `src/lib/combat.ts` — `rollDie`, `parseDice`, `rollDice`, `resolveAttack`, `pickAbility`, `resolveTurn`, `runCombat`
- [ ] TASK-06: [API] Create `src/app/api/heroes/route.ts` — `GET /api/heroes?q=` with lexical sort + fallback browse
- [ ] TASK-07: [API] Create `src/app/api/heroes/[id]/route.ts` — `GET /api/heroes/:id` point-read
- [ ] TASK-08: [API] Create `src/app/api/monsters/route.ts` — `GET /api/monsters?q=`
- [ ] TASK-09: [API] Create `src/app/api/monsters/[id]/route.ts` — `GET /api/monsters/:id` point-read
- [ ] TASK-10: [UI] Create `src/components/CharacterCard.tsx` — image, stats, abilities, selected ring, broken-image fallback
- [ ] TASK-11: [UI] Create `src/components/SearchBar.tsx` — debounced input, result count label with collection name
- [ ] TASK-12: [UI] Create `src/components/CombatLog.tsx` — scrollable log entry list, auto-scroll
- [ ] TASK-13: [UI] Create `src/components/CombatArena.tsx` — combatant summaries, Fight! button, log, result banner, Reset
- [ ] TASK-14: [UI] Wire `src/app/page.tsx` — three-column layout, hero/monster state, search → card selection → combat flow
- [ ] TASK-15: [UI] Style `src/app/globals.css` — dark fantasy theme, scrollbar styles, base typography
- [ ] TASK-16: [verify] Run `npm run build` — zero type errors, zero build errors
