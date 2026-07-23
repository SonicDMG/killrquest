# Agentic RAG Chat — Requirements

## User Story

As a KillrQuest player, I want to chat with an AI agent that can look up heroes and monsters from the database and simulate battles, so that I can explore the roster and discuss matchups conversationally.

---

## Requirements

### REQ-001 — Chat Panel UI

A persistent chat panel is visible in the app. The user can type a message and receive a response from an AI agent. Conversation history is preserved for the duration of the session (page load). The panel does not require a page navigation.

**Acceptance criteria:**
- Chat input and send button are visible at all times
- Previous messages remain visible as the conversation grows
- The user can send a message by pressing Enter or clicking Send
- Streaming responses render incrementally (tokens appear as they arrive)
- A loading/thinking indicator is shown while the agent is working

### REQ-002 — Hero Search Tool

The agent can search heroes by semantic query using the existing `heroes_v2` Astra collection. It returns hero name, class, description, HP, AC, and abilities.

**Acceptance criteria:**
- Agent responds with accurate hero data drawn from Astra
- Natural-language queries work ("find a healer", "who is the strongest fighter")
- At least the top 3 results are surfaced to the agent

### REQ-003 — Monster Search Tool

The agent can search monsters by semantic query using the existing `monsters_v2` Astra collection. It returns monster name, description, HP, AC, and abilities.

**Acceptance criteria:**
- Same as REQ-002 but for monsters
- At least the top 3 results are surfaced to the agent

### REQ-004 — Battle Simulation Tool

The agent can simulate a battle between a named hero and a named monster using the existing `runCombat()` logic. The agent reports the outcome (winner, turns, key events) in natural language.

**Acceptance criteria:**
- Agent can look up hero and monster by name, then run the simulation
- Response includes winner, how many turns it lasted, and notable ability uses
- The combat log does not need to be rendered in the UI — the agent summarises it in text

### REQ-005 — OpenAI-Compatible API Endpoint

The chat is backed by a Next.js API route that is compatible with the OpenAI Chat Completions API (streamed). The route implements an agentic tool-use loop: it calls the model, executes any requested tools against Astra, feeds results back, and repeats until the model produces a final text response.

**Acceptance criteria:**
- POST `/api/agent` accepts `{ messages: ChatMessage[] }`
- Returns a streaming `text/event-stream` response
- Works with Ollama's OpenAI-compat endpoint (`http://localhost:11434/v1`)
- Model and base URL are configurable via `OLLAMA_BASE_URL` and `OLLAMA_MODEL` env vars

### REQ-006 — System Prompt

The agent has a system prompt that establishes its role as a KillrQuest game master: it knows about the hero/monster roster, can look up characters, and can narrate battles.

**Acceptance criteria:**
- Agent introduces itself appropriately if asked
- Responses stay in the context of KillrQuest (heroes, monsters, combat)

---

## Out of Scope

- Persistent chat history across page reloads (no DB storage of messages)
- Authentication or per-user chat sessions
- Rendering the combat log visually in the chat panel
- Selecting heroes/monsters from chat to populate the combat arena
- Any model other than Ollama (no OpenAI, Anthropic, etc. keys required)
- Streaming token-by-token within tool execution (tool results are batch)
