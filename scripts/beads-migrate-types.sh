#!/usr/bin/env bash
# scripts/beads-migrate-types.sh
# Replace flat-task epics with properly typed beads:
#   epic      — feature container + user story
#   feature   — individual requirement (REQ-NNN)
#   decision  — architecture / design decision (ADR)
#   task      — implementation unit of work
#
# All beads are closed immediately (everything is already delivered).
set -e

# Helper: create bead, return id. Strips non-JSON lines from stdout.
bead() { bd create "$@" --json 2>/dev/null | jq -r '.id'; }
close() { bd close "$1" 2>/dev/null; }

echo "=== beads type migration ==="

# ─────────────────────────────────────────────────────────────────────────────
# EPIC 1 — initial-app
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── initial-app ──"
E=$(bead "initial-app — KillrQuest bootstrap" \
  --type epic --priority 2 \
  --description "Workshop demo: hero/monster search via AstraDB lexical+rerank, turn-based combat engine, dark fantasy UI. No local DB — all data in AstraDB. Stack: Next.js 14, TypeScript, Tailwind, @datastax/astra-db-ts.")
echo "  epic $E"

# Requirements
R1=$(bead "REQ-001 — Hero search" --type feature --parent "$E" --priority 2 \
  --description "User can type a natural language query to search heroes. Results ranked by relevance using Astra lexical + rerank." \
  --acceptance "Typing 'nature magic healer' returns Thorn the Wild near the top.")
close "$R1"; echo "  REQ-001 $R1"

R2=$(bead "REQ-002 — Monster search" --type feature --parent "$E" --priority 2 \
  --description "User can type a natural language query to search monsters. Same lexical + rerank pipeline as heroes." \
  --acceptance "Typing 'undead spellcaster' returns Lich near the top.")
close "$R2"; echo "  REQ-002 $R2"

R3=$(bead "REQ-003 — Browse all" --type feature --parent "$E" --priority 2 \
  --description "User can browse the full hero and monster rosters without a search query." \
  --acceptance "Default view shows all available heroes/monsters.")
close "$R3"; echo "  REQ-003 $R3"

R4=$(bead "REQ-004 — Hero card" --type feature --parent "$E" --priority 2 \
  --description "Each hero displays: image, name, class, HP, AC, attack bonus, damage die, and abilities list. Images load from imageUrl field (GCS URLs).")
close "$R4"; echo "  REQ-004 $R4"

R5=$(bead "REQ-005 — Monster card" --type feature --parent "$E" --priority 2 \
  --description "Each monster displays: image, name, HP, AC, attack bonus, damage die, and abilities list. Monsters with local /cdn/... paths show a fallback placeholder.")
close "$R5"; echo "  REQ-005 $R5"

R6=$(bead "REQ-006 — Selection state" --type feature --parent "$E" --priority 2 \
  --description "Selected hero and monster are visually highlighted. Only one hero and one monster can be selected at a time.")
close "$R6"; echo "  REQ-006 $R6"

R7=$(bead "REQ-007 — Start combat" --type feature --parent "$E" --priority 2 \
  --description "Fight! button enabled only when both hero and monster are selected." \
  --acceptance "Clicking starts a new combat session.")
close "$R7"; echo "  REQ-007 $R7"

R8=$(bead "REQ-008 — Turn-by-turn combat loop" --type feature --parent "$E" --priority 2 \
  --description "Combat alternates: hero attacks first, then monster. d20 + attackBonus vs armorClass. HP tracked in local state (no Astra writes). Each turn produces a readable log line.")
close "$R8"; echo "  REQ-008 $R8"

R9=$(bead "REQ-009 — Ability usage" --type feature --parent "$E" --priority 2 \
  --description "Heroes and monsters with abilities may use one per turn instead of a basic attack. Healing restores HP (capped at maxHitPoints). Attack abilities use their own damageDice.")
close "$R9"; echo "  REQ-009 $R9"

R10=$(bead "REQ-010 — Combat end" --type feature --parent "$E" --priority 2 \
  --description "Combat ends when either combatant reaches 0 HP. Clear win/loss result shown with remaining HP. User can reset without reloading.")
close "$R10"; echo "  REQ-010 $R10"

R11=$(bead "REQ-011 — Visible data source" --type feature --parent "$E" --priority 2 \
  --description "UI shows which Astra collection each piece of data came from. Search queries and result counts shown." \
  --acceptance "Workshop can narrate what is happening in Astra.")
close "$R11"; echo "  REQ-011 $R11"

R12=$(bead "REQ-012 — Live Astra reads during combat" --type feature --parent "$E" --priority 2 \
  --description "At combat start, hero and monster documents are fetched fresh from Astra (not cached from search results) to demonstrate OLTP point reads.")
close "$R12"; echo "  REQ-012 $R12"

# Design decisions
D1=$(bead "DESIGN: no local DB — all persistence in AstraDB" --type decision --parent "$E" --priority 2 \
  --description "Single-user local app. AstraDB collections heroes_v2 and monsters_v2 are the only data store. Combat state lives in React state only — no writes back to Astra." \
  --design "Stack: Next.js 14 App Router, TypeScript, Tailwind, @datastax/astra-db-ts. Collections already have lexical:enabled and rerank:nvidia/llama-3.2-nv-rerankqa-1b-v2 configured. Use sort:{$lexical:query} for search — triggers reranker automatically.")
close "$D1"; echo "  DESIGN(arch) $D1"

D2=$(bead "DESIGN: combat resolved all-at-once, drip-fed in UI" --type decision --parent "$E" --priority 2 \
  --description "runCombat() executes synchronously and returns all CombatLogEntry[]. The UI replays entries at 150ms intervals for dramatic effect. Combat engine is pure — no I/O, no side effects." \
  --design "Keeps combat.ts testable and deterministic. UI polling avoids server round-trips during playback. CharacterCard uses onError to swap broken /cdn/ images to a styled placeholder.")
close "$D2"; echo "  DESIGN(combat) $D2"

# Tasks
for T in \
  "TASK-01:[scaffold] Bootstrap Next.js 14 app with TypeScript + Tailwind, install @datastax/astra-db-ts" \
  "TASK-02:[scaffold] Create .env.local with Astra endpoint, token, and keyspace" \
  "TASK-03:[lib] Create src/lib/types.ts — Hero, Monster, Ability, CombatLogEntry" \
  "TASK-04:[lib] Create src/lib/astra.ts — DataAPIClient singleton, heroesCollection, monstersCollection" \
  "TASK-05:[lib] Create src/lib/combat.ts — rollDie, parseDice, rollDice, resolveAttack, pickAbility, resolveTurn, runCombat" \
  "TASK-06:[API] GET /api/heroes?q= — lexical sort + fallback browse" \
  "TASK-07:[API] GET /api/heroes/[id] — point-read" \
  "TASK-08:[API] GET /api/monsters?q= — lexical sort + fallback browse" \
  "TASK-09:[API] GET /api/monsters/[id] — point-read" \
  "TASK-10:[UI] CharacterCard.tsx — image, stats, abilities, selected ring, broken-image fallback" \
  "TASK-11:[UI] SearchBar.tsx — debounced input, result count label" \
  "TASK-12:[UI] CombatLog.tsx — scrollable log, auto-scroll" \
  "TASK-13:[UI] CombatArena.tsx — combatant summaries, Fight! button, log, result banner, Reset" \
  "TASK-14:[UI] page.tsx — three-column layout wired to hero/monster/combat state" \
  "TASK-15:[UI] globals.css — dark fantasy theme, scrollbar styles, base typography" \
  "TASK-16:[verify] npm run build — zero type errors"
do
  LABEL="${T%%:*}"; TITLE="${T#*:}"
  ID=$(bead "$LABEL: $TITLE" --type task --parent "$E" --priority 2 \
    --description "initial-app implementation task.")
  close "$ID"
done
echo "  16 tasks closed"
close "$E"; echo "  epic closed"

# ─────────────────────────────────────────────────────────────────────────────
# EPIC 2 — agentic-rag-chat
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── agentic-rag-chat ──"
E=$(bead "agentic-rag-chat — AI game master with tool use" \
  --type epic --priority 2 \
  --description "Agentic chat panel inside the combat arena (tabbed alongside Battle Log). Backed by Ollama OpenAI-compat endpoint. Agent can search heroes, search monsters, and simulate battles as tools.")
echo "  epic $E"

R=$(bead "REQ-001 — Chat panel UI" --type feature --parent "$E" --priority 2 \
  --description "Persistent chat panel visible in app. User types a message and receives a streaming response. Session history preserved for the page lifetime." \
  --acceptance "Input and send visible at all times. Previous messages remain visible. Enter submits. Streaming tokens render incrementally. Loading indicator shown while agent works.")
close "$R"; echo "  REQ-001 $R"

R=$(bead "REQ-002 — Hero search tool" --type feature --parent "$E" --priority 2 \
  --description "Agent can search heroes by semantic query using heroes_v2 collection. Returns name, class, description, HP, AC, abilities." \
  --acceptance "Natural-language queries work. At least top 3 results surfaced to agent.")
close "$R"; echo "  REQ-002 $R"

R=$(bead "REQ-003 — Monster search tool" --type feature --parent "$E" --priority 2 \
  --description "Agent can search monsters by semantic query using monsters_v2 collection. Returns name, description, HP, AC, abilities." \
  --acceptance "Same as REQ-002 but for monsters.")
close "$R"; echo "  REQ-003 $R"

R=$(bead "REQ-004 — Battle simulation tool" --type feature --parent "$E" --priority 2 \
  --description "Agent can simulate a battle between a named hero and monster using runCombat(). Reports outcome in natural language." \
  --acceptance "Agent looks up hero and monster by name, runs simulation, reports winner, turns, notable ability uses.")
close "$R"; echo "  REQ-004 $R"

R=$(bead "REQ-005 — OpenAI-compatible API endpoint" --type feature --parent "$E" --priority 2 \
  --description "POST /api/agent accepts {messages: ChatMessage[]}. Returns streaming text/event-stream. Implements agentic tool-use loop against Ollama OpenAI-compat endpoint." \
  --acceptance "Works with OLLAMA_BASE_URL and OLLAMA_MODEL env vars. Tool-resolution turns non-streaming; final turn SSE.")
close "$R"; echo "  REQ-005 $R"

R=$(bead "REQ-006 — System prompt" --type feature --parent "$E" --priority 2 \
  --description "Agent has a system prompt establishing its role as KillrQuest game master." \
  --acceptance "Agent introduces itself appropriately. Responses stay in KillrQuest context.")
close "$R"; echo "  REQ-006 $R"

D=$(bead "DESIGN: tab layout inside CombatArena" --type decision --parent "$E" --priority 2 \
  --description "Chat lives below the combat arena portraits as a tabbed interface alongside Battle Log. Two tabs share the scrollable lower region. No three-column layout changes." \
  --design "Tab state (activeTab: log|chat) lives in CombatArena. ChatPanel is rendered when activeTab===chat. page.tsx needs no changes.")
close "$D"; echo "  DESIGN(layout) $D"

D=$(bead "DESIGN: agentic loop — tool rounds non-streaming, final turn SSE" --type decision --parent "$E" --priority 2 \
  --description "Tool-resolution turns use stream:false for simplicity. Only the final answer turn streams. Max 5 tool iterations before forcing a final response." \
  --design "agent-tools.ts exports TOOLS array, executeTool() dispatcher, and SYSTEM_PROMPT. POST /api/agent route drives the loop. Ollama must support tool_calls in response.")
close "$D"; echo "  DESIGN(loop) $D"

for T in \
  "TASK-01:[lib] src/lib/agent-tools.ts — SYSTEM_PROMPT, TOOLS array, executeTool()" \
  "TASK-02:[API] POST /api/agent/route.ts — agentic loop, tool rounds non-streaming, final turn SSE" \
  "TASK-03:[UI] src/components/ChatPanel.tsx — message list, SSE consumer, input, send, loading indicator" \
  "TASK-04:[UI] CombatArena.tsx — activeTab state, Battle Log / Chat tabs, render ChatPanel"
do
  LABEL="${T%%:*}"; TITLE="${T#*:}"
  ID=$(bead "$LABEL: $TITLE" --type task --parent "$E" --priority 2 \
    --description "agentic-rag-chat implementation task.")
  close "$ID"
done
echo "  4 tasks closed"
close "$E"; echo "  epic closed"

# ─────────────────────────────────────────────────────────────────────────────
# EPIC 3 — battle-animations
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── battle-animations ──"
E=$(bead "battle-animations — combat card visual effects" \
  --type epic --priority 2 \
  --description "Lunge, shake, flash, sparkle, and defeated-state CSS animations on hero/monster cards, triggered one-at-a-time in sync with the existing 150ms drip-feed timer.")
echo "  epic $E"

for N in 1 2 3 4 5 6 7 8; do
  case $N in
    1) T="REQ-001 — Battle visual panel"; A="Both cards visible from Fight! click through end of combat."
       D="BattleVisual component renders when hero&&monster. Sits between StatCard row and Fight button.";;
    2) T="REQ-002 — Attacker lunge animation"; A="Every log entry triggers visible forward motion on attacker card."
       D="CSS class .battle-hit-hero (translateX right) / .battle-hit-monster (translateX left). Applied even on miss.";;
    3) T="REQ-003 — Hit reaction on defender"; A="Shake plays only when entry.hit===true and entry.damage>0."
       D=".battle-shake class applied to defender card. Removed after 500ms.";;
    4) T="REQ-004 — Miss reaction on attacker"; A="Miss and hit produce visually distinct attacker animations."
       D=".battle-miss class (wobbly opacity/rotate stumble) instead of lunge when !entry.hit.";;
    5) T="REQ-005 — Flash effect on hit"; A="Flash on right edge of hero card, left edge of monster card on hit."
       D="Flash div injected into attacker card DOM via ref on hit. Removes itself on animationend.";;
    6) T="REQ-006 — Healing sparkles"; A="Sparkles appear on whichever combatant healed themselves."
       D="5 .battle-sparkle-particle divs injected at random offsets when entry.healing!=null. Each removes itself on animationend.";;
    7) T="REQ-007 — Defeated card state"; A="Defeated card visually distinct from healthy card by last log entry."
       D=".battle-card-defeated (grayscale + tilt, CSS transition) toggled via heroHp/monsterHp props flowing into BattleVisual.";;
    8) T="REQ-008 — Animations sync with drip-feed"; A="Each log entry fires exactly one animation round before the next."
       D="triggerCombatAnimation() called inside existing setInterval, after idx advances. One call per tick.";;
  esac
  R=$(bead "$T" --type feature --parent "$E" --priority 2 \
    --description "$D" --acceptance "$A")
  close "$R"; echo "  REQ-00$N $R"
done

D=$(bead "DESIGN: DOM mutation via refs, no React re-renders" --type decision --parent "$E" --priority 2 \
  --description "Animations applied by adding/removing CSS classes directly on DOM elements via useRef handles (heroCardRef, monsterCardRef). Avoids React re-render overhead inside the tight 150ms drip-feed loop." \
  --design "triggerCombatAnimation(entry, heroName, heroRef, monsterRef) is a plain function in CombatArena.tsx. Class removal uses setTimeout matching animation duration + 50ms buffer. Flash and sparkle divs are injected and self-remove on animationend. All keyframes and utility classes live in globals.css.")
close "$D"; echo "  DESIGN(dom-mutation) $D"

for T in \
  "TASK-01:[CSS] globals.css — all animation keyframes and utility classes" \
  "TASK-02:[UI] triggerCombatAnimation helper function in CombatArena.tsx" \
  "TASK-03:[UI] BattleVisual component in CombatArena.tsx" \
  "TASK-04:[UI] heroCardRef and monsterCardRef refs passed to BattleVisual" \
  "TASK-05:[UI] Wire triggerCombatAnimation into drip-feed setInterval" \
  "TASK-06:[UI] .battle-card-defeated toggled from heroHp/monsterHp props" \
  "TASK-07:[verify] npx tsc --noEmit + npm run build clean"
do
  LABEL="${T%%:*}"; TITLE="${T#*:}"
  ID=$(bead "$LABEL: $TITLE" --type task --parent "$E" --priority 2 \
    --description "battle-animations implementation task.")
  close "$ID"
done
echo "  7 tasks closed"
close "$E"; echo "  epic closed"

# ─────────────────────────────────────────────────────────────────────────────
# EPIC 4 — multi-provider-chat
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── multi-provider-chat ──"
E=$(bead "multi-provider-chat — Ollama/OpenAI/OpenRouter + conversation threading" \
  --type epic --priority 1 \
  --description "Provider selection (Ollama/OpenAI/OpenRouter), server-managed conversation threads persisted in AstraDB conversations_v1 collection, conversation switcher UI. Provider credentials via env only.")
echo "  epic $E"

R=$(bead "REQ-001 — Provider selection" --type feature --parent "$E" --priority 1 \
  --description "User can select a provider (Ollama, OpenAI, OpenRouter) independently of the model. UI exposes a provider dropdown; model list updates to reflect only models available for that provider." \
  --acceptance "Selecting a different provider clears the model dropdown and loads the appropriate model list. Selected provider+model sent with every chat request. Switching provider does NOT destroy the current conversation history.")
close "$R"; echo "  REQ-001 $R"

R=$(bead "REQ-002 — Server-managed conversation threads" --type feature --parent "$E" --priority 1 \
  --description "Each conversation has a server-assigned conversationId. Client sends only the latest user message plus conversationId; server owns history reconstruction." \
  --acceptance "First message with no conversationId creates a new conversation and returns the new ID in SSE stream before the first token. Subsequent messages resume the thread. Ollama/OpenRouter store full message array. OpenAI stores only previous_response_id.")
close "$R"; echo "  REQ-002 $R"

R=$(bead "REQ-003 — Multiple conversations" --type feature --parent "$E" --priority 1 \
  --description "User can start a new conversation at any time without losing previous ones. A conversation list lets the user switch between conversations." \
  --acceptance "New conversation clears chat view. Switching to a past conversation replays stored messages. Conversations labeled with creation timestamp and first user message truncated to ~40 chars.")
close "$R"; echo "  REQ-003 $R"

R=$(bead "REQ-004 — SSE streaming preserved" --type feature --parent "$E" --priority 1 \
  --description "All final-answer turns stream token-by-token to the client via SSE, identical to prior behaviour." \
  --acceptance "First SSE event is {conversationId} for new conversations. Subsequent events are {token}. Final event is [DONE].")
close "$R"; echo "  REQ-004 $R"

R=$(bead "REQ-005 — Provider credentials via environment" --type feature --parent "$E" --priority 1 \
  --description "API keys for OpenAI and OpenRouter are read from env only; UI never exposes or accepts raw keys." \
  --acceptance "OPENAI_API_KEY controls OpenAI availability. OPENROUTER_API_KEY controls OpenRouter. Missing key omits that provider from the providers list. Ollama always available.")
close "$R"; echo "  REQ-005 $R"

R=$(bead "REQ-006 — Conversation persistence" --type feature --parent "$E" --priority 1 \
  --description "Conversations survive a browser refresh." \
  --acceptance "Conversations and message history stored server-side in AstraDB conversations_v1. Client fetches conversation list on mount and after each new conversation is created.")
close "$R"; echo "  REQ-006 $R"

D=$(bead "DESIGN: AstraDB conversations_v1 collection schema" --type decision --parent "$E" --priority 1 \
  --description "AstraDB schemaless collection conversations_v1. ConversationDoc holds _id (nanoid), createdAt, label (first user message truncated 40 chars), provider, model. Stateless providers (ollama, openrouter) store messages[]. OpenAI stores only previousResponseId (Responses API threading)." \
  --design "No schema migration needed — AstraDB creates collection on first write. Added to astra.ts: export const conversationsCollection = db.collection<ConversationDoc>('conversations_v1').")
close "$D"; echo "  DESIGN(schema) $D"

D=$(bead "DESIGN: llm.ts provider abstraction — chatStream() generator" --type decision --parent "$E" --priority 1 \
  --description "Single async generator chatStream() abstracts all three providers. Returns LLMEvent discriminated union: tool_calls | token | done. Agentic loop (tool rounds) lives entirely inside llm.ts, invisible to the route." \
  --design "Ollama and OpenRouter use Chat Completions shape. OpenAI uses Responses API (different request shape, different streaming events). Tool rounds use stream:false; final answer streams. Route simply consumes events and forwards tokens as SSE.")
close "$D"; echo "  DESIGN(llm) $D"

D=$(bead "DESIGN: POST /api/agent request shape change" --type decision --parent "$E" --priority 1 \
  --description "Route now accepts {provider, model, message, conversationId?} instead of {model, messages:[]}. Client sends a single message; server reconstructs full history from AstraDB." \
  --design "On new conversation: createConversation() → emit {conversationId} as first SSE event. On existing: getConversation() to load history. After done event: appendMessages() or updateResponseId() depending on provider.")
close "$D"; echo "  DESIGN(route) $D"

for T in \
  "TASK-01:[lib] Add ConversationDoc type to src/lib/types.ts" \
  "TASK-02:[lib] Add conversationsCollection to src/lib/astra.ts" \
  "TASK-03:[lib] Create src/lib/conversations.ts — createConversation, appendMessages, updateResponseId, getConversation, listConversations" \
  "TASK-04:[lib] Create src/lib/llm.ts — chatStream() with Ollama + OpenRouter adapters, full agentic loop" \
  "TASK-05:[lib] Add OpenAI Responses API adapter to src/lib/llm.ts" \
  "TASK-06:[API] GET /api/agent/providers — returns available providers based on env keys" \
  "TASK-07:[API] GET /api/agent/models?provider= — static lists for openai/openrouter, Ollama logic for ollama" \
  "TASK-08:[API] GET /api/agent/conversations — calls listConversations()" \
  "TASK-09:[API] GET /api/agent/conversations/[id] — calls getConversation()" \
  "TASK-10:[API] Rewrite POST /api/agent — accept provider/model/message/conversationId, emit conversationId as first SSE event" \
  "TASK-11:[UI] Create src/components/ConversationList.tsx — list, active highlight, New Conversation button" \
  "TASK-12:[UI] Refactor ChatPanel.tsx — provider dropdown, conversationId state, SSE conversationId event" \
  "TASK-13:[UI] Update page.tsx — ConversationList as left column, fetch and pass conversations"
do
  LABEL="${T%%:*}"; TITLE="${T#*:}"
  ID=$(bead "$LABEL: $TITLE" --type task --parent "$E" --priority 1 \
    --description "multi-provider-chat implementation task.")
  close "$ID"
done
echo "  13 tasks closed"
close "$E"; echo "  epic closed"

echo ""
echo "=== migration complete ==="
OPEN=$(bd list --json 2>/dev/null | jq 'length')
TOTAL=$(bd list --all --json 2>/dev/null | jq 'length')
echo "Total beads (all time): $TOTAL | Open: $OPEN"
