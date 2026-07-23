# Agentic RAG Chat — Tasks

## Tasks

- [x] TASK-01: [lib] Create `src/lib/agent-tools.ts` — `SYSTEM_PROMPT`, `TOOLS` array, `executeTool()` with `search_heroes`, `search_monsters`, `simulate_battle` implementations
- [x] TASK-02: [API] Create `src/app/api/agent/route.ts` — agentic loop (tool-resolution turns non-streaming, final turn SSE), Ollama-backed, env-configured
- [x] TASK-03: [UI] Create `src/components/ChatPanel.tsx` — message list, streaming SSE consumer, input, send button, loading indicator
- [x] TASK-04: [UI] Update `src/components/CombatArena.tsx` — add `activeTab` state, Battle Log / Chat tab bar, render `<ChatPanel />` in chat tab
