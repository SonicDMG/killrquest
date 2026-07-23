import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/agent-tools";
import { chatStream } from "@/lib/llm";
import {
  createConversation,
  getConversation,
  appendMessages,
  updateResponseId,
} from "@/lib/conversations";
import type { ChatMessage, Provider } from "@/lib/types";

export const runtime = "nodejs";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "glm-5.2:cloud";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const provider: Provider = body?.provider ?? "ollama";
  const model: string = body?.model ?? OLLAMA_MODEL;
  const userMessage: string = body?.message ?? "";
  let conversationId: string | undefined = body?.conversationId;

  if (!userMessage) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // ── Resolve or create conversation ────────────────────────────────────────
  let isNew = false;
  let storedMessages: ChatMessage[] = [];
  let previousResponseId: string | undefined;

  if (conversationId) {
    const conv = await getConversation(conversationId);
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    storedMessages = conv.messages ?? [];
    previousResponseId = conv.previousResponseId;
    console.log("[agent] resuming conversation %s, %d stored messages", conversationId, storedMessages.length);
  } else {
    conversationId = await createConversation({ provider, model, firstUserMessage: userMessage });
    isNew = true;
    console.log("[agent] created conversation %s", conversationId);
  }

  // Build full message list for this turn
  const newUserMsg: ChatMessage = { role: "user", content: userMessage };
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...storedMessages,
    newUserMsg,
  ];

  console.log("[agent] provider=%s model=%s messages=%d", provider, model, messages.length);

  // ── Stream ─────────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullContent = "";
  // Accumulated messages for stateless providers (includes tool rounds + final assistant)
  const accumulatedMessages: ChatMessage[] = [...storedMessages, newUserMsg];

  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        // New conversation — tell the client its ID before the first token
        if (isNew) {
          enqueue(JSON.stringify({ conversationId }));
        }

        const stream = chatStream({ provider, model, messages, previousResponseId });

        for await (const event of stream) {
          if (event.type === "tool_calls") {
            // Accumulate tool-round messages for persistence
            accumulatedMessages.push(event.assistantMessage);
            for (const tc of event.calls) {
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(tc.function.arguments); } catch { /* */ }
              const { executeTool } = await import("@/lib/agent-tools");
              const result = await executeTool(tc.function.name, args);
              accumulatedMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
          } else if (event.type === "token") {
            fullContent += event.token;
            enqueue(JSON.stringify({ token: event.token }));
          } else if (event.type === "done") {
            // Persist conversation state
            if (provider === "openai" && event.previousResponseId) {
              await updateResponseId(conversationId!, event.previousResponseId);
            } else {
              // Append final assistant message and persist full history
              accumulatedMessages.push({ role: "assistant", content: fullContent });
              // Strip system message before storing
              await appendMessages(
                conversationId!,
                accumulatedMessages.filter((m) => m.role !== "system")
              );
            }
            console.log("[agent] stream done, content length=%d", fullContent.length);
            enqueue("[DONE]");
            controller.close();
            return;
          }
        }

        // Safety fallback if stream ends without a done event
        enqueue("[DONE]");
      } catch (e) {
        console.error("[agent] stream error:", e);
        enqueue(JSON.stringify({ error: String(e) }));
        enqueue("[DONE]");
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
