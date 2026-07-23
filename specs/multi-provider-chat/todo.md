# Task Plan — Multi-Provider Chat with Conversation Threading

## Tasks

- [ ] TASK-01: [lib] Add `ConversationDoc` type to `src/lib/types.ts`
- [ ] TASK-02: [lib] Add `conversationsCollection` to `src/lib/astra.ts`
- [ ] TASK-03: [lib] Create `src/lib/conversations.ts` — createConversation, appendMessages, updateResponseId, getConversation, listConversations
- [ ] TASK-04: [lib] Create `src/lib/llm.ts` — `chatStream()` with Ollama + OpenRouter adapters (Chat Completions shape, SSE), full agentic loop
- [ ] TASK-05: [lib] Add OpenAI Responses API adapter to `src/lib/llm.ts`
- [ ] TASK-06: [API] Add `GET /api/agent/providers/route.ts` — returns available providers based on env keys
- [ ] TASK-07: [API] Update `GET /api/agent/models/route.ts` — accept `?provider=` param, return static lists for openai/openrouter, existing Ollama logic for ollama
- [ ] TASK-08: [API] Add `GET /api/agent/conversations/route.ts` — calls listConversations()
- [ ] TASK-09: [API] Add `GET /api/agent/conversations/[id]/route.ts` — calls getConversation(), returns full message history
- [ ] TASK-10: [API] Rewrite `POST /api/agent/route.ts` — accept `{provider, model, message, conversationId?}`, use llm.ts + conversations.ts, emit conversationId as first SSE event
- [ ] TASK-11: [UI] Create `src/components/ConversationList.tsx` — list, active highlight, New Conversation button
- [ ] TASK-12: [UI] Refactor `src/components/ChatPanel.tsx` — add provider dropdown, wire conversationId state, update sendMessage to new POST body shape, handle conversationId SSE event
- [ ] TASK-13: [UI] Update `src/app/page.tsx` — add ConversationList as left column, fetch + pass conversations

## Done when

- TASK-03: `createConversation` returns a `string` ID; `listConversations` returns newest-first array
- TASK-04: `chatStream` yields `tool_calls`, `token`, and `done` events; tested against Ollama manually via logs
- TASK-05: OpenAI adapter yields same event types; `done` event includes `previousResponseId`
- TASK-10: A new conversation (no `conversationId` in body) returns `data: {"conversationId":"..."}` as the first SSE frame
- TASK-12: Switching provider clears model list and reloads; existing conversation is preserved

## Follow-up (out of scope for this PR)

- Conversation delete / rename
- Per-user isolation (auth)
- Model parameter controls (temperature etc.)
- Streaming tool-call progress indicators
