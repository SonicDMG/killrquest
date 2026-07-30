# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->


## Build & Run

```bash
npm install
npm run dev       # dev server on :3000
npm run build     # production build (must pass zero errors)
npx tsc --noEmit  # type-check only
```

## Architecture Overview

```
Next.js :3000
  ├── src/app/api/agent/          ← agentic chat + provider/model/conversation routes
  ├── src/app/api/heroes|monsters ← Astra search + point-read routes
  ├── src/lib/
  │     ├── types.ts              ← Hero, Monster, Ability, CombatLogEntry
  │     ├── astra.ts              ← DataAPIClient singleton, collection exports
  │     ├── combat.ts             ← turn-based combat engine (pure functions)
  │     ├── llm.ts                ← chatStream() — Ollama, OpenAI, OpenRouter adapters
  │     ├── conversations.ts      ← AstraDB conversation persistence
  │     └── agent-tools.ts        ← SYSTEM_PROMPT, TOOLS, executeTool()
  └── src/components/
        ├── CharacterCard.tsx     ← hero/monster display card
        ├── SearchBar.tsx         ← debounced search input
        ├── CombatArena.tsx       ← fight orchestration + BattleVisual + animations
        ├── CombatLog.tsx         ← scrollable turn-by-turn log
        ├── ChatPanel.tsx         ← streaming SSE chat UI
        └── ConversationList.tsx  ← conversation switcher sidebar
```

**Data:** AstraDB (heroes_v2, monsters_v2 collections for game data; conversations collection for chat persistence). No local database — all persistence is Astra.

## Feature Development Workflow

**Every new feature MUST follow this order — no exceptions:**

1. **Epic** — `bd create "<feature-name> — <summary>" --type epic`
2. **Requirements** — one `feature` bead per REQ (`--acceptance` for testable criteria)
3. **Design decisions** — one `decision` bead per architecture choice (`--design` for specifics)
4. **Tasks** — one `task` bead per implementation unit under the epic
5. **Implement** — `bd update <id> --claim` → implement → `bd close <id>`

**Beads is the spec.** No separate markdown files. To generate human-readable output on demand:
```bash
bd list --all --parent <epic-id> --json | jq '.[] | select(.issue_type=="feature") | {title, description, acceptance}'
```

**If requirements change mid-feature:**
- `bd update <req-bead-id> --description "updated prose"`
- `bd create "REQ-NNN revised — <what changed>" --type task --parent <epic-id>`
- `bd dep add <affected-task-id> <blocker-id>`

## Conventions & Patterns

- **No markdown spec or TODO files** — beads is the spec; `bd create` for all tracking
- **No MEMORY.md files** — use `bd remember "insight"` instead
- All API routes in `src/app/api/` follow Next.js App Router conventions (`route.ts`)
- Combat engine (`src/lib/combat.ts`) is pure — no side effects, no Astra calls
- Provider credentials via env only: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`
