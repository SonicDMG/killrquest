# Design — Multi-Provider Chat with Conversation Threading

## Overview

The work splits into four layers: **provider abstraction** (`src/lib/llm.ts`), **conversation store** (`src/lib/conversations.ts` backed by AstraDB), **API routes** (two new + one updated), and **UI** (`ChatPanel.tsx` refactored, new `ConversationList` component).

---

## 1. New AstraDB collection — `conversations_v1`

Each document represents one conversation thread.

```ts
interface ConversationDoc {
  _id: string;                  // nanoid, e.g. "conv_abc123"
  createdAt: string;            // ISO timestamp
  label: string;                // first user message, truncated to 40 chars
  provider: "ollama" | "openai" | "openrouter";
  model: string;
  // Stateless providers (ollama, openrouter) store full message history:
  messages?: ChatMessage[];
  // OpenAI Responses API stores only the last response ID:
  previousResponseId?: string;
}
```

Added to `src/lib/astra.ts`:
```ts
export const conversationsCollection = db.collection<ConversationDoc>("conversations_v1");
```

No schema migration needed — AstraDB collections are schemaless; just referencing the
collection name creates it on first write.

---

## 2. `src/lib/llm.ts` — Provider abstraction

Single exported function:

```ts
export async function* chatStream(params: {
  provider: "ollama" | "openai" | "openrouter";
  model: string;
  messages: ChatMessage[];          // full history for stateless providers
  previousResponseId?: string;      // OpenAI Responses API only
  tools: OAITool[];
}): AsyncGenerator<LLMEvent>
```

`LLMEvent` is a discriminated union:
```ts
type LLMEvent =
  | { type: "tool_calls"; calls: ToolCall[]; assistantMessage: ChatMessage }
  | { type: "token"; token: string }
  | { type: "done"; previousResponseId?: string }   // OpenAI returns this
```

### Provider implementations (all inside `llm.ts`)

| Provider | Tool rounds endpoint | Final stream endpoint | Auth header |
|---|---|---|---|
| `ollama` | `OLLAMA_BASE_URL/v1/chat/completions` | same, `stream:true` | none |
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | same, `stream:true` | `Authorization: Bearer OPENROUTER_API_KEY` |
| `openai` | `https://api.openai.com/v1/responses` | same, `stream:true` | `Authorization: Bearer OPENAI_API_KEY` |

OpenAI Responses API differences:
- Request shape: `{ model, input: messages, tools, stream: true, previous_response_id? }`
- Streaming events: `response.output_text.delta` carries tokens; `response.completed` carries the new `response.id`
- No separate tool-round / streaming-round split — the Responses API handles both in one streaming call; tool execution still happens server-side

The agentic loop (tool rounds → final stream) lives entirely in `llm.ts` and is invisible to the route.

---

## 3. `src/lib/conversations.ts` — Conversation store

```ts
// Create a new conversation, return its ID
export async function createConversation(params: {
  provider: string; model: string; firstUserMessage: string;
}): Promise<string>

// Append messages to a stateless conversation's stored history
export async function appendMessages(
  id: string, messages: ChatMessage[]
): Promise<void>

// Update the OpenAI previousResponseId
export async function updateResponseId(
  id: string, previousResponseId: string
): Promise<void>

// Load a conversation (messages + metadata)
export async function getConversation(id: string): Promise<ConversationDoc | null>

// List all conversations, newest first
export async function listConversations(): Promise<ConversationDoc[]>
```

---

## 4. API routes

### 4a. `GET /api/agent/providers` (new)

Returns which providers are available based on env keys.

**Response:**
```json
{
  "providers": [
    { "id": "ollama",      "label": "Ollama",      "baseUrl": "http://localhost:11434" },
    { "id": "openrouter",  "label": "OpenRouter"   },
    { "id": "openai",      "label": "OpenAI"       }
  ]
}
```

Ollama always included. OpenAI included iff `OPENAI_API_KEY` set. OpenRouter included iff `OPENROUTER_API_KEY` set.

### 4b. `GET /api/agent/models?provider=ollama` (updated)

Existing `/api/agent/models` route is extended to accept a `provider` query param.

- `provider=ollama` → current behaviour (fetch Ollama `/api/tags`, filter `capabilities.tools`)
- `provider=openai` → static list of known tool-capable models: `["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]`
- `provider=openrouter` → static list: `["openai/gpt-4o", "anthropic/claude-3-5-sonnet", "meta-llama/llama-3.3-70b-instruct"]`

### 4c. `GET /api/agent/conversations` (new)

Returns `listConversations()` — all threads, newest first.

**Response:**
```json
{
  "conversations": [
    { "id": "conv_abc", "label": "How does Sir Perci…", "createdAt": "…", "provider": "ollama", "model": "glm-5.2:cloud" }
  ]
}
```

### 4d. `GET /api/agent/conversations/[id]` (new)

Returns the full message history for a conversation (for replaying in the UI).

**Response:**
```json
{
  "conversation": { "id": "…", "label": "…", "messages": [...], "provider": "ollama", "model": "glm-5.2:cloud" }
}
```

### 4e. `POST /api/agent` (updated)

**Request body changes:**

Before:
```json
{ "model": "...", "messages": [...full history...] }
```

After:
```json
{
  "provider": "ollama",
  "model": "glm-5.2:cloud",
  "message": "How does Sir Percival compare?",
  "conversationId": "conv_abc123"   // omit to start a new conversation
}
```

**Server logic:**

1. If `conversationId` absent → call `createConversation()`, get new ID.
2. Load conversation via `getConversation(id)`.
3. Build full `messages` array (system prompt + stored history + new user message).
4. Call `chatStream()` from `llm.ts` — consume `LLMEvent`s:
   - `tool_calls` → run tools, append assistant + tool messages, loop
   - `token` → forward as `data: {"token":"..."}` SSE
   - `done` → if `previousResponseId` present, call `updateResponseId()`; otherwise call `appendMessages()` with the full updated history
5. On new conversation: emit `data: {"conversationId":"..."}` as the very first SSE event.
6. Emit `data: [DONE]`.

---

## 5. UI changes

### `src/components/ChatPanel.tsx` — refactored

State changes:
```ts
// Remove:
messages: Message[]          // no longer client-owned

// Add:
conversationId: string | null
provider: "ollama" | "openai" | "openrouter"
providers: Provider[]
conversations: ConversationSummary[]
displayMessages: Message[]   // local display copy, rebuilt when switching conversations
```

`sendMessage` changes:
- POST body: `{ provider, model, message, conversationId }`
- On first SSE event: if `{"conversationId":"..."}` → save to state, refresh conversation list
- Token events: same as today

On mount:
- Fetch `/api/agent/providers` → populate provider list, default to first available
- Fetch `/api/agent/conversations` → populate conversation list

### `src/components/ConversationList.tsx` (new)

Slim sidebar panel listing past conversations. Props:
```ts
{
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}
```

Selecting a conversation calls `GET /api/agent/conversations/[id]` and sets `displayMessages` in `ChatPanel`.

### `src/app/page.tsx` — layout

`ConversationList` is added as a left column alongside the existing chat panel. Exact layout TBD to match existing dark stone aesthetic.

---

## REQ Coverage

| REQ | Design item |
|-----|-------------|
| REQ-001 | `/api/agent/providers`, `/api/agent/models?provider=`, provider dropdown in `ChatPanel` |
| REQ-002 | `conversations_v1` collection, `conversations.ts`, `llm.ts` provider dispatch, updated `POST /api/agent` |
| REQ-003 | `ConversationList` component, `GET /api/agent/conversations`, `onNew` action |
| REQ-004 | `llm.ts` `token` events, `conversationId` as first SSE event, `[DONE]` sentinel |
| REQ-005 | `/api/agent/providers` key-presence check, `llm.ts` auth headers |
| REQ-006 | `conversations_v1` in AstraDB, fetched on mount |
