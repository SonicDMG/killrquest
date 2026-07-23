# Agentic RAG Chat — Design

## Overview

The chat lives **inside the center panel**, below the combat arena portraits/stat cards, as a tabbed interface alongside the existing Battle Log. Two tabs — **Battle Log** and **💬 Chat** — share the scrollable lower region of the center column. This makes full use of the vertical space that's currently occupied by the battle log, without touching the three-column layout at all.

The Chat tab calls `POST /api/agent` which drives an agentic tool-use loop against Ollama's OpenAI-compat endpoint, executing Astra searches and combat simulations as tools before streaming the final answer back.

---

## `src/lib/` changes

### `src/lib/agent-tools.ts` (new)

Exports three things:

1. **`TOOLS`** — the OpenAI tool definitions array passed to every model call:
   - `search_heroes(query: string, limit?: number)` — semantic search heroes_v2
   - `search_monsters(query: string, limit?: number)` — semantic search monsters_v2
   - `simulate_battle(hero_name: string, monster_name: string)` — run combat, return summary

2. **`executeTool(name, args)`** — dispatches to the correct implementation:
   - `search_heroes` / `search_monsters`: calls `heroesCollection.find` / `monstersCollection.find` with `{ sort: { $vectorize: query }, limit, includeSimilarity: true }`, returns array of trimmed character objects (name, class/type, description, hp, ac, abilities)
   - `simulate_battle`: finds hero by name (`findOne({ name: heroName })`), finds monster by name, calls `runCombat(hero, monster)` from `src/lib/combat.ts`, summarises the log into a plain object `{ winner, turns, heroFinalHp, monsterFinalHp, abilitiesUsed[] }`

3. **`SYSTEM_PROMPT`** — string constant defining the game master persona.

### `src/lib/combat.ts` — no changes

### `src/lib/astra.ts` — no changes

---

## API route

### `POST /api/agent`

**File:** `src/app/api/agent/route.ts`  
**Runtime:** `export const runtime = "nodejs"`

**Request body:**
```json
{ "messages": [ { "role": "user", "content": "..." } ] }
```

**Response:** `text/event-stream`, SSE stream. Each event is either:
- `data: <token>\n\n` — a text delta from the model
- `data: [DONE]\n\n` — stream end

**Agentic loop (server-side, no streaming during tool execution):**

```
1. Prepend SYSTEM_PROMPT as { role: "system" }
2. POST to OLLAMA_BASE_URL/v1/chat/completions
     { model: OLLAMA_MODEL, messages, tools: TOOLS, stream: false }
3. If response has tool_calls:
   a. Append assistant message with tool_calls to messages
   b. For each tool call: executeTool(name, args) → append tool result message
   c. GOTO 2 (loop until no tool_calls, max 5 iterations)
4. Final call with stream: true
5. Pipe SSE chunks → client as data: <token>
```

The loop uses `stream: false` for all tool-resolution turns (simpler, avoids double-streaming complexity). Only the final turn streams.

**Error handling:** if Ollama is unreachable or returns non-2xx, respond with `500` and a JSON error body before any streaming begins.

---

## UI changes

### `src/components/ChatPanel.tsx` (new)

Client component. State:
- `messages: { role, content }[]` — rendered conversation
- `input: string` — current text field value
- `streaming: boolean` — true while waiting for/receiving response

Behaviour:
- On submit: append user message, set `streaming: true`, POST to `/api/agent` with full history, read SSE stream, accumulate tokens into a growing assistant message, set `streaming: false` on `[DONE]`
- Auto-scroll to bottom on each new token
- Enter key submits (shift+Enter = newline)
- Send button disabled while `streaming`
- Shows a pulsing `•••` indicator appended to the last assistant message while streaming

Styling: dark theme matching the existing `bg-gray-950` palette. Messages left-aligned (assistant) / right-aligned (user). Monospace font for ability/stat blocks if the model wraps them in code fences.

### `src/components/CombatArena.tsx` — changes

- Accept a new optional prop `chatSlot?: React.ReactNode` — but actually the simpler approach: move tab state **into** `CombatArena` itself.
- Add `activeTab: "log" | "chat"` state, default `"log"`.
- Render two tab buttons (`Battle Log` / `💬 Chat`) above the lower scrollable region.
- When `activeTab === "log"`: render the existing `<CombatLog>` content (unchanged).
- When `activeTab === "chat"`: render `<ChatPanel />`.
- The upper portion (portraits + stat cards + "View Battle Chronicle" button) is unchanged.

### `src/app/page.tsx` — no changes needed

The tab lives entirely within `CombatArena`. No new state or layout changes required at the page level.

---

## REQ Coverage

| REQ-ID | Design item |
|--------|-------------|
| REQ-001 | `ChatPanel.tsx` — message list, input, streaming, loading indicator |
| REQ-002 | `agent-tools.ts` `search_heroes` tool + `executeTool` dispatch |
| REQ-003 | `agent-tools.ts` `search_monsters` tool + `executeTool` dispatch |
| REQ-004 | `agent-tools.ts` `simulate_battle` tool + `runCombat` integration |
| REQ-005 | `src/app/api/agent/route.ts` — agentic loop, SSE stream, env-config |
| REQ-006 | `SYSTEM_PROMPT` constant in `agent-tools.ts` |
