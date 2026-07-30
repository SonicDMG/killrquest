#!/usr/bin/env bash
# scripts/beads-import.sh — one-shot backport of all killrquest specs into beads
# Run from the killrquest project root.
set -e

# Helper: create a bead and return its ID
create_bead() {
  bd create "$@" --json 2>/dev/null | jq -r '.id'
}

echo "=== killrquest beads backport ==="

# ─── EPIC: initial-app ────────────────────────────────────────────────────────
echo ""
echo "Creating epic: initial-app..."
E1=$(create_bead "initial-app — KillrQuest bootstrap" \
  --type epic --priority 2 \
  --description "Bootstrap Next.js 14 app with Astra hero/monster search, turn-based combat engine, dark fantasy UI. See specs/initial-app/requirements.md")
echo "  epic: $E1"

# All initial-app tasks are open
create_bead "TASK-01: [scaffold] Bootstrap Next.js 14 app with TypeScript + Tailwind, install @datastax/astra-db-ts" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-01 open"
create_bead "TASK-02: [scaffold] Create .env.local with Astra endpoint, token, and keyspace" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-02 open"
create_bead "TASK-03: [lib] Create src/lib/types.ts — Hero, Monster, Ability, CombatLogEntry interfaces" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-03 open"
create_bead "TASK-04: [lib] Create src/lib/astra.ts — singleton DataAPIClient, export heroesCollection and monstersCollection" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-04 open"
create_bead "TASK-05: [lib] Create src/lib/combat.ts — rollDie, parseDice, rollDice, resolveAttack, pickAbility, resolveTurn, runCombat" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-05 open"
create_bead "TASK-06: [API] Create src/app/api/heroes/route.ts — GET /api/heroes?q= with lexical sort + fallback browse" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-06 open"
create_bead "TASK-07: [API] Create src/app/api/heroes/[id]/route.ts — GET /api/heroes/:id point-read" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-07 open"
create_bead "TASK-08: [API] Create src/app/api/monsters/route.ts — GET /api/monsters?q=" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-08 open"
create_bead "TASK-09: [API] Create src/app/api/monsters/[id]/route.ts — GET /api/monsters/:id point-read" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-09 open"
create_bead "TASK-10: [UI] Create src/components/CharacterCard.tsx — image, stats, abilities, selected ring, broken-image fallback" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-10 open"
create_bead "TASK-11: [UI] Create src/components/SearchBar.tsx — debounced input, result count label with collection name" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-11 open"
create_bead "TASK-12: [UI] Create src/components/CombatLog.tsx — scrollable log entry list, auto-scroll" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-12 open"
create_bead "TASK-13: [UI] Create src/components/CombatArena.tsx — combatant summaries, Fight! button, log, result banner, Reset" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-13 open"
create_bead "TASK-14: [UI] Wire src/app/page.tsx — three-column layout, hero/monster state, search to card selection to combat flow" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-14 open"
create_bead "TASK-15: [UI] Style src/app/globals.css — dark fantasy theme, scrollbar styles, base typography" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md" > /dev/null
echo "  TASK-15 open"
ID=$(create_bead "TASK-16: [verify] npm run build — zero type errors, zero build errors" --parent "$E1" --priority 2 --description "See specs/initial-app/requirements.md")
echo "  TASK-16 open — $ID"

# ─── EPIC: agentic-rag-chat ───────────────────────────────────────────────────
echo ""
echo "Creating epic: agentic-rag-chat..."
E2=$(create_bead "agentic-rag-chat — AI game master with tool use" \
  --type epic --priority 2 \
  --description "Agentic chat panel backed by Ollama with hero search, monster search, and battle simulation tools. All tasks completed. See specs/agentic-rag-chat/requirements.md")
echo "  epic: $E2"

ID=$(create_bead "TASK-01: [lib] Create src/lib/agent-tools.ts — SYSTEM_PROMPT, TOOLS array, executeTool with search_heroes, search_monsters, simulate_battle" --parent "$E2" --priority 2 --description "See specs/agentic-rag-chat/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-01 closed"

ID=$(create_bead "TASK-02: [API] Create src/app/api/agent/route.ts — agentic loop, tool-resolution turns non-streaming, final turn SSE, Ollama-backed" --parent "$E2" --priority 2 --description "See specs/agentic-rag-chat/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-02 closed"

ID=$(create_bead "TASK-03: [UI] Create src/components/ChatPanel.tsx — message list, streaming SSE consumer, input, send button, loading indicator" --parent "$E2" --priority 2 --description "See specs/agentic-rag-chat/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-03 closed"

ID=$(create_bead "TASK-04: [UI] Update src/components/CombatArena.tsx — add activeTab state, Battle Log / Chat tab bar, render ChatPanel in chat tab" --parent "$E2" --priority 2 --description "See specs/agentic-rag-chat/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-04 closed"

bd close "$E2" > /dev/null; echo "  epic closed"

# ─── EPIC: battle-animations ──────────────────────────────────────────────────
echo ""
echo "Creating epic: battle-animations..."
E3=$(create_bead "battle-animations — combat card visual effects" \
  --type epic --priority 2 \
  --description "Lunge, shake, flash, sparkle, and defeated-state animations synced with 150ms drip-feed timer. All tasks completed. See specs/battle-animations/requirements.md")
echo "  epic: $E3"

ID=$(create_bead "TASK-01: [CSS] Finalise animation keyframes and utility classes in src/app/globals.css" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-01 closed"

ID=$(create_bead "TASK-02: [UI] Add triggerCombatAnimation helper to src/components/CombatArena.tsx" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-02 closed"

ID=$(create_bead "TASK-03: [UI] Add BattleVisual component to src/components/CombatArena.tsx" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-03 closed"

ID=$(create_bead "TASK-04: [UI] Create heroCardRef and monsterCardRef refs in CombatArena and pass to BattleVisual" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-04 closed"

ID=$(create_bead "TASK-05: [UI] Wire triggerCombatAnimation into the drip-feed setInterval in CombatArena" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-05 closed"

ID=$(create_bead "TASK-06: [UI] Apply .battle-card-defeated class conditionally in BattleVisual based on heroHp and monsterHp props" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-06 closed"

ID=$(create_bead "TASK-07: [verify] npx tsc --noEmit zero errors, npm run build clean" --parent "$E3" --priority 2 --description "See specs/battle-animations/requirements.md")
bd close "$ID" > /dev/null; echo "  TASK-07 closed"

bd close "$E3" > /dev/null; echo "  epic closed"

# ─── EPIC: multi-provider-chat ────────────────────────────────────────────────
echo ""
echo "Creating epic: multi-provider-chat..."
E4=$(create_bead "multi-provider-chat — Ollama/OpenAI/OpenRouter + conversation threading" \
  --type epic --priority 1 \
  --description "Provider selection, server-managed conversation threads with AstraDB persistence, conversation switcher UI. See specs/multi-provider-chat/requirements.md")
echo "  epic: $E4"

create_bead "TASK-01: [lib] Add ConversationDoc type to src/lib/types.ts" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-01 open"
create_bead "TASK-02: [lib] Add conversationsCollection to src/lib/astra.ts" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-02 open"
create_bead "TASK-03: [lib] Create src/lib/conversations.ts — createConversation, appendMessages, updateResponseId, getConversation, listConversations" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-03 open"
create_bead "TASK-04: [lib] Create src/lib/llm.ts — chatStream with Ollama and OpenRouter adapters, full agentic loop" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-04 open"
create_bead "TASK-05: [lib] Add OpenAI Responses API adapter to src/lib/llm.ts" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-05 open"
create_bead "TASK-06: [API] Add GET /api/agent/providers/route.ts — returns available providers based on env keys" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-06 open"
create_bead "TASK-07: [API] Update GET /api/agent/models/route.ts — accept provider param, return static lists for openai/openrouter, Ollama logic for ollama" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-07 open"
create_bead "TASK-08: [API] Add GET /api/agent/conversations/route.ts — calls listConversations()" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-08 open"
create_bead "TASK-09: [API] Add GET /api/agent/conversations/[id]/route.ts — calls getConversation(), returns full message history" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-09 open"
create_bead "TASK-10: [API] Rewrite POST /api/agent/route.ts — accept provider/model/message/conversationId, emit conversationId as first SSE event" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-10 open"
create_bead "TASK-11: [UI] Create src/components/ConversationList.tsx — list, active highlight, New Conversation button" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-11 open"
create_bead "TASK-12: [UI] Refactor src/components/ChatPanel.tsx — add provider dropdown, wire conversationId state, handle conversationId SSE event" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-12 open"
create_bead "TASK-13: [UI] Update src/app/page.tsx — add ConversationList as left column, fetch and pass conversations" --parent "$E4" --priority 1 --description "See specs/multi-provider-chat/requirements.md" > /dev/null; echo "  TASK-13 open"

echo ""
echo "=== Import complete ==="
echo ""
TOTAL=$(bd list --json | jq 'length')
echo "Total beads: $TOTAL"
