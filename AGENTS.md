# Agent Instructions — killrquest

killrquest is a Next.js workshop demo: hero/monster search via AstraDB, turn-based combat, and an agentic chat panel with multi-provider LLM support.

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context.

> **Architecture in one line:** Issues live in a local Dolt database
> (`.beads/dolt/`); cross-machine sync uses `bd dolt push/pull` (a
> git-compatible protocol), stored under `refs/dolt/data` on your git
> remote — separate from `refs/heads/*` where your code lives.
> `.beads/issues.jsonl` is a passive export, not the wire protocol.
>
> See [SYNC_CONCEPTS.md](https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md)
> for the one-screen overview and anti-patterns (don't treat JSONL as the
> source of truth; don't `bd import` during normal operation; don't
> reach for third-party Dolt hosting before trying the default).

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd dolt push          # Push beads data to remote
```

## Bead Types — What to Use When

| Type | Flag | Use for | Appears in `bd ready`? |
|---|---|---|---|
| `epic` | `--type epic` | Feature container. Holds user story in `--description`. | No |
| `feature` | `--type feature` | One requirement (REQ-NNN). Use `--acceptance` for testable criteria. | No |
| `decision` | `--type decision` | One architecture/design decision (ADR). Use `--design` for specifics. | No |
| `task` | `--type task` | One implementation unit of work. The only type agents pick up and claim. | **Yes** |
| `bug` | `--type bug` | Defect to fix. Treated like a task — claimable. | **Yes** |
| `chore` | `--type chore` | Housekeeping (deps, config, docs). Claimable. | **Yes** |

`feature` and `decision` beads are **context nodes** — they describe what and why. `task`, `bug`, and `chore` beads are **work queue items** — they describe what to build. An agent running `bd ready` only sees work queue items; requirements and decisions stay visible via `bd show <epic-id>` or `bd list --parent <epic-id>`.

## Feature Development Workflow

**Every new feature MUST follow this order:**

1. **Epic** — `bd create "<feature-name> — <summary>" --type epic`
2. **Requirements** — one `feature` bead per REQ, with `--acceptance` for testable criteria
3. **Design decisions** — one `decision` bead per architecture choice, with `--design` for specifics
4. **Tasks** — one `task` bead per implementation unit under the epic
5. **Work** — `bd update <id> --claim` → implement → `bd close <id>`
6. **Sync** — `bd dolt push` after closing tasks

**Beads IS the spec.** No separate markdown files.

```bash
# 1. Epic — the feature container
bd create "auth — user login with JWT" --type epic --priority 1 \
  --description "As a user I want to log in so that my data is private."

# 2. Requirements — what must be true (not claimable, context only)
bd create "REQ-001 — Login with email + password" --type feature --parent <epic-id> \
  --description "User submits email and password. Server validates and returns a JWT." \
  --acceptance "Valid credentials return 200 + {token}. Invalid return 401. Empty fields return 400."

# 3. Design decisions — how we build it (not claimable, context only)
bd create "DESIGN: stateless JWT, no session store" --type decision --parent <epic-id> \
  --description "JWT stored in httpOnly cookie. No server-side session. RS256 signing." \
  --design "Token expiry 1h. Refresh token in separate httpOnly cookie, 7d. Auth middleware reads cookie header."

# 4. Tasks — what to build (claimable by agents)
bd create "TASK-01: [API] POST /api/auth/login — validate credentials, return JWT" \
  --type task --parent <epic-id> --priority 1 \
  --description "Implements REQ-001. See DESIGN: stateless JWT bead for token shape."
```

**When requirements change mid-feature:**
```bash
# 1. Update the requirement bead in-place
bd update <feature-bead-id> --description "Updated prose..." --acceptance "Updated criteria..."

# 2. Create a blocker task so affected work is gated
bd create "REQ-001 revised — now requires email verification" \
  --type task --parent <epic-id>

# 3. Block the affected implementation tasks
bd dep add <affected-task-id> <blocker-id>
# bd ready automatically removes blocked tasks from the queue
```

**To read requirements back as prose** (e.g. to generate a human-readable doc):
```bash
bd list --all --parent <epic-id> --json \
  | jq -r '.[] | select(.issue_type=="feature") | "### \(.title)\n\(.description)\n\nAcceptance: \(.acceptance // "—")\n"'
```

**Never:**
- Create markdown spec or TODO files — beads IS the spec
- Create MEMORY.md files — use `bd remember "insight"` instead
- Write code before the epic and `feature` requirements exist

## Architecture

```
Next.js :3000
  src/app/api/agent/          — agentic chat, provider/model/conversation routes
  src/app/api/heroes|monsters — Astra search + point-read routes
  src/lib/types.ts            — Hero, Monster, Ability, CombatLogEntry
  src/lib/astra.ts            — DataAPIClient singleton
  src/lib/combat.ts           — pure turn-based combat engine
  src/lib/llm.ts              — chatStream() Ollama/OpenAI/OpenRouter adapters
  src/lib/conversations.ts    — AstraDB conversation persistence
  src/lib/agent-tools.ts      — SYSTEM_PROMPT, TOOLS, executeTool()
  src/components/             — CharacterCard, SearchBar, CombatArena, ChatPanel, ConversationList
```

**Build:** `npm run build` and `npx tsc --noEmit` must both pass zero errors before closing any task.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
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
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
