import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, TOOLS, executeTool } from "@/lib/agent-tools";

export const runtime = "nodejs";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "glm-5.2:cloud";
const MAX_TOOL_ROUNDS = 5;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  // Allow client to override the model; fall back to env default
  const model = (body.model as string | undefined) ?? OLLAMA_MODEL;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...body.messages,
  ];

  console.log("[agent] ── NEW REQUEST ──────────────────────────────");
  console.log("[agent] model:", model);
  console.log("[agent] messages sent to model:", JSON.stringify(messages, null, 2));

  // -------------------------------------------------------------------------
  // Agentic loop — non-streaming tool rounds
  // -------------------------------------------------------------------------
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.log(`[agent] tool round ${round + 1}/${MAX_TOOL_ROUNDS}`);

    const reqBody = {
      model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      stream: false,
    };
    console.log("[agent] → fetch /v1/chat/completions (non-stream):", JSON.stringify(reqBody, null, 2));

    const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[agent] Ollama error:", res.status, text);
      return NextResponse.json(
        { error: `Ollama error ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices: { message: ChatMessage; finish_reason: string }[];
    };

    console.log("[agent] ← raw response:", JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    if (!choice) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    const assistantMsg = choice.message;

    // No tool calls → break out and stream the final answer
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      console.log("[agent] no tool calls, proceeding to final stream");
      break;
    }

    console.log("[agent] tool calls:", JSON.stringify(assistantMsg.tool_calls, null, 2));

    // Append assistant message with tool_calls
    messages.push(assistantMsg);

    // Execute each tool call and append tool result messages
    for (const tc of assistantMsg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        // leave args empty
      }
      console.log(`[agent] executing tool "${tc.function.name}" args:`, args);
      const result = await executeTool(tc.function.name, args);
      console.log(`[agent] tool "${tc.function.name}" result:`, JSON.stringify(result, null, 2));
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Final streaming turn — NO tools passed so model just generates prose
  // -------------------------------------------------------------------------
  const finalReqBody = {
    model,
    messages,
    stream: true,
  };
  console.log("[agent] → final streaming request:", JSON.stringify(finalReqBody, null, 2));

  const streamRes = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalReqBody),
  });

  if (!streamRes.ok || !streamRes.body) {
    const text = await streamRes.text().catch(() => "");
    console.error("[agent] stream error:", streamRes.status, text);
    return NextResponse.json(
      { error: `Ollama stream error ${streamRes.status}: ${text}` },
      { status: 502 }
    );
  }

  // Pipe Ollama SSE → client, extracting content deltas
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = streamRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

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
              console.log("[agent] stream complete. full content:\n", fullContent);
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            try {
              const chunk = JSON.parse(payload) as {
                choices: { delta: { content?: string }; finish_reason?: string }[];
              };
              const token = chunk.choices?.[0]?.delta?.content;
              if (token) {
                fullContent += token;
                // Send as a JSON envelope so the client can parse it reliably
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                );
              }
            } catch {
              // malformed chunk — skip
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
