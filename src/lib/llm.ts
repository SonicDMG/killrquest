import { TOOLS, executeTool, SYSTEM_PROMPT } from "./agent-tools";
import type { ChatMessage, Provider } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OAITool = (typeof TOOLS)[number];

export type LLMEvent =
  | { type: "tool_calls"; calls: ToolCall[]; assistantMessage: ChatMessage }
  | { type: "token"; token: string }
  | { type: "done"; previousResponseId?: string };

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type CompletionResponse = {
  choices: { message: ChatMessage; finish_reason: string }[];
};

type StreamChunk = {
  choices: { delta: { content?: string; tool_calls?: Partial<ToolCall>[] }; finish_reason?: string }[];
};

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OPENAI_BASE = "https://api.openai.com/v1";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

function baseUrl(provider: Provider): string {
  if (provider === "openai") return OPENAI_BASE;
  if (provider === "openrouter") return OPENROUTER_BASE;
  return `${OLLAMA_BASE}/v1`;
}

function authHeaders(provider: Provider): Record<string, string> {
  if (provider === "openai") {
    return { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  }
  if (provider === "openrouter") {
    return { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Chat Completions adapter — Ollama + OpenRouter (+ OpenAI non-Responses path)
// ---------------------------------------------------------------------------

async function chatCompletionNonStream(
  provider: Provider,
  model: string,
  messages: ChatMessage[]
): Promise<CompletionResponse> {
  const res = await fetch(`${baseUrl(provider)}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(provider) },
    body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: "auto", stream: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[llm] ${provider} non-stream error ${res.status}: ${text}`);
  }
  return res.json();
}

async function* chatCompletionStream(
  provider: Provider,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<LLMEvent> {
  const res = await fetch(`${baseUrl(provider)}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(provider) },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`[llm] ${provider} stream error ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          yield { type: "done" };
          return;
        }
        try {
          const chunk = JSON.parse(payload) as StreamChunk;
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) yield { type: "token", token };
        } catch {
          // malformed chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  yield { type: "done" };
}

// ---------------------------------------------------------------------------
// OpenAI Responses API adapter
// ---------------------------------------------------------------------------

type ResponsesRequest = {
  model: string;
  input: ChatMessage[];
  tools: OAITool[];
  stream: boolean;
  previous_response_id?: string;
};

type ResponsesStreamEvent =
  | { type: "response.output_text.delta"; delta: string }
  | { type: "response.completed"; response: { id: string } }
  | { type: string };

async function* openaiResponsesStream(
  model: string,
  messages: ChatMessage[],
  previousResponseId?: string
): AsyncGenerator<LLMEvent> {
  const reqBody: ResponsesRequest = {
    model,
    input: messages,
    tools: TOOLS,
    stream: true,
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
  };

  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`[llm] openai responses error ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let newResponseId: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          yield { type: "done", previousResponseId: newResponseId };
          return;
        }
        try {
          const event = JSON.parse(payload) as ResponsesStreamEvent;
          if (event.type === "response.output_text.delta" && "delta" in event) {
            yield { type: "token", token: (event as { type: string; delta: string }).delta };
          } else if (event.type === "response.completed" && "response" in event) {
            newResponseId = (event as { type: string; response: { id: string } }).response.id;
          }
        } catch {
          // malformed chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  yield { type: "done", previousResponseId: newResponseId };
}

// ---------------------------------------------------------------------------
// Main export — full agentic loop
// ---------------------------------------------------------------------------

const MAX_TOOL_ROUNDS = 5;

export async function* chatStream(params: {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  previousResponseId?: string;
}): AsyncGenerator<LLMEvent> {
  const { provider, model, previousResponseId } = params;
  // Work on a mutable copy so we can append tool results
  const messages: ChatMessage[] = [...params.messages];

  console.log("[llm] chatStream provider=%s model=%s messages=%d", provider, model, messages.length);

  // OpenAI Responses API handles tool-use natively in the stream — delegate entirely
  if (provider === "openai") {
    yield* openaiResponsesStream(model, messages, previousResponseId);
    return;
  }

  // Stateless providers: run agentic tool loop, then stream final answer
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.log("[llm] tool round %d/%d", round + 1, MAX_TOOL_ROUNDS);
    const data = await chatCompletionNonStream(provider, model, messages);
    console.log("[llm] round response finish_reason=%s", data.choices?.[0]?.finish_reason);

    const assistantMsg = data.choices?.[0]?.message;
    if (!assistantMsg) throw new Error("[llm] empty response from model");

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      console.log("[llm] no tool calls — proceeding to stream");
      break;
    }

    console.log("[llm] tool calls:", JSON.stringify(assistantMsg.tool_calls));
    yield { type: "tool_calls", calls: assistantMsg.tool_calls, assistantMessage: assistantMsg };

    messages.push(assistantMsg);

    for (const tc of assistantMsg.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* leave empty */ }
      console.log("[llm] executing tool %s args=%o", tc.function.name, args);
      const result = await executeTool(tc.function.name, args);
      console.log("[llm] tool %s result=%s", tc.function.name, JSON.stringify(result));
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  // Final streaming turn — no tools so model generates plain prose
  console.log("[llm] starting final stream, total messages=%d", messages.length);
  yield* chatCompletionStream(provider, model, messages);
}

// Expose the final messages array after tool rounds for persistence
export async function resolveMessages(params: {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  previousResponseId?: string;
}): Promise<{ messages: ChatMessage[]; previousResponseId?: string }> {
  const { provider, model, previousResponseId } = params;
  const messages: ChatMessage[] = [...params.messages];

  if (provider === "openai") {
    // OpenAI state is server-side; we only track the response ID
    return { messages, previousResponseId };
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await chatCompletionNonStream(provider, model, messages);
    const assistantMsg = data.choices?.[0]?.message;
    if (!assistantMsg) break;
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      messages.push(assistantMsg);
      break;
    }
    messages.push(assistantMsg);
    for (const tc of assistantMsg.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* */ }
      const result = await executeTool(tc.function.name, args);
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }
  return { messages };
}
