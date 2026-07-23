# Requirements — Multi-Provider Chat with Conversation Threading

## User Story

As a KillrQuest player, I want to choose between Ollama, OpenAI, and OpenRouter as my
AI provider and have my chat history persisted as named conversations, so that I can
switch providers freely and return to previous Game Master sessions without losing context.

---

## Requirements

### REQ-001 — Provider selection
The user can select a provider (Ollama, OpenAI, OpenRouter) independently of the model.
The UI exposes a provider dropdown; the model list updates to reflect only models
available for that provider.

**Acceptance criteria:**
- Selecting a different provider clears the model dropdown and loads the appropriate model list.
- The selected provider + model are sent with every chat request.
- Switching provider does NOT destroy the current conversation history.

---

### REQ-002 — Server-managed conversation threads
Each conversation has a server-assigned `conversationId`. The client sends only the
latest user message plus the `conversationId`; the server owns history reconstruction.

**Acceptance criteria:**
- First message with no `conversationId` → server creates a new conversation and returns
  the new ID in the SSE stream before the first token.
- Subsequent messages include the existing `conversationId`; server resumes the thread.
- For Ollama and OpenRouter (stateless providers): server stores the full message array.
- For OpenAI Responses API: server stores only the `previous_response_id`.

---

### REQ-003 — Multiple conversations
The user can start a new conversation at any time without losing previous ones. A
conversation list (sidebar or dropdown) lets the user switch between conversations.

**Acceptance criteria:**
- "New conversation" action creates a fresh thread and clears the chat view.
- Switching to a past conversation replays its stored messages in the chat view.
- Conversations are labeled with their creation timestamp and the first user message
  (truncated to ~40 chars).

---

### REQ-004 — SSE streaming preserved
All final-answer turns stream token-by-token to the client via Server-Sent Events,
identical to the current behaviour.

**Acceptance criteria:**
- First SSE event is `data: {"conversationId":"..."}` (new conversation) or omitted
  (existing conversation).
- Subsequent SSE events are `data: {"token":"..."}` as today.
- Final event is `data: [DONE]`.

---

### REQ-005 — Provider credentials via environment
API keys for OpenAI and OpenRouter are read from environment variables only; the UI
never exposes or accepts raw keys.

**Acceptance criteria:**
- `OPENAI_API_KEY` controls OpenAI availability.
- `OPENROUTER_API_KEY` controls OpenRouter availability.
- If a key is absent, that provider is omitted from the provider list returned by
  `/api/agent/providers`.
- Ollama is always available (no key required).

---

### REQ-006 — Conversation persistence
Conversations survive a browser refresh (not just in-memory React state).

**Acceptance criteria:**
- Conversations and their message history are stored server-side (AstraDB or in-memory
  Map is acceptable for v1; AstraDB preferred for persistence across restarts).
- The client fetches the conversation list on mount and after each new conversation is
  created.

---

## Out of Scope

- User authentication / per-user conversation isolation
- Conversation deletion or renaming by the user
- Model parameter tuning (temperature, top-p, etc.) in the UI
- OpenAI fine-tuned or assistant-API models
- Streaming tool-call results (tool rounds remain non-streaming as today)
- Mobile / responsive layout changes
