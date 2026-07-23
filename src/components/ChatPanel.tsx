"use client";

import { useRef, useState, useEffect, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? "glm-5.2:cloud";

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch available tool-capable models on mount
  useEffect(() => {
    fetch("/api/agent/models")
      .then((r) => r.json())
      .then((data: { models: string[] }) => {
        if (data.models.length > 0) {
          setModels(data.models);
          // Keep current model if it's in the list, otherwise use first
          setModel((prev) =>
            data.models.includes(prev) ? prev : data.models[0]
          );
        }
      })
      .catch(() => {/* leave defaults */})
      .finally(() => setModelsLoading(false));
  }, []);

  // Auto-scroll on every new token
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Append empty assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "⚠️ Agent unavailable. Check Ollama is running." },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
          if (payload === "[DONE]") break;
          accumulated += payload;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: accumulated },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Network error reaching the agent." },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, model]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* Model picker */}
      <div
        className="px-3 py-1.5 flex items-center gap-2 shrink-0"
        style={{ borderBottom: "1px solid #292524" }}
      >
        <span className="text-xs shrink-0" style={{ color: "#78716c" }}>Model:</span>
        {modelsLoading ? (
          <span className="text-xs" style={{ color: "#57534e" }}>Loading…</span>
        ) : models.length === 0 ? (
          <span className="text-xs" style={{ color: "#b45309" }}>No tool-capable models found</span>
        ) : (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={streaming}
            className="flex-1 text-xs rounded px-2 py-1 outline-none disabled:opacity-50"
            style={{
              background: "#1c1917",
              color: "#e7e5e4",
              border: "1px solid #3c3836",
            }}
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-center text-sm mt-8" style={{ color: "#78716c" }}>
            <p className="text-2xl mb-2">🎲</p>
            <p className="font-serif italic" style={{ color: "#a8a29e" }}>
              Ask the Game Master anything.
            </p>
            <p className="mt-1 text-xs" style={{ color: "#57534e" }}>
              &ldquo;Who would win — Sir Percival vs Keyboard Monster?&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed break-words"
              style={
                msg.role === "user"
                  ? {
                      background: "#92400e",
                      color: "#fef3c7",
                      borderBottomRightRadius: "4px",
                    }
                  : {
                      background: "#1c1917",
                      color: "#e7e5e4",
                      border: "1px solid #292524",
                      borderBottomLeftRadius: "4px",
                    }
              }
            >
              {msg.role === "assistant" && msg.content === "" && streaming ? (
                <span className="inline-flex gap-1 items-center" style={{ color: "#78716c" }}>
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
                </span>
              ) : msg.role === "assistant" ? (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="px-3 py-2 flex gap-2 items-end shrink-0"
        style={{ borderTop: "1px solid #292524" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming}
          rows={1}
          placeholder="Ask the Game Master…"
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: "#1c1917",
            color: "#e7e5e4",
            border: "1px solid #3c3836",
            maxHeight: "96px",
            lineHeight: "1.5",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="rounded-lg px-3 py-2 text-sm font-bold transition-opacity disabled:opacity-30"
          style={{
            background: "linear-gradient(135deg,#92400e,#b45309)",
            color: "#fef3c7",
            border: "2px solid #78350f",
            fontFamily: "serif",
            whiteSpace: "nowrap",
          }}
        >
          Send ⚔️
        </button>
      </div>
    </div>
  );
}
