"use client";

import { useRef, useState, useEffect, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Provider } from "@/lib/types";

type Role = "user" | "assistant";
interface DisplayMessage {
  role: Role;
  content: string;
}

interface ProviderInfo {
  id: Provider;
  label: string;
}

interface Props {
  activeConversationId: string | null;
  onConversationCreated: (id: string, meta: { provider: Provider; model: string; label: string }) => void;
  onStreamEnd?: () => void;
}

const OLLAMA_DEFAULT = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? "glm-5.2:cloud";

const QUIPS = [
  "🎲 Rolling the dice of fate…",
  "📜 Consulting the ancient tomes…",
  "🧙 The wizard is thinking…",
  "⚔️ Sharpening the lore…",
  "🔮 Gazing into the crystal ball…",
  "🗺️ Mapping the dungeon…",
  "🐉 Negotiating with the dragon…",
  "🕯️ Deciphering the runes…",
  "🌑 The shadows whisper back…",
  "🏰 Consulting the castle records…",
  "💀 The bones have been cast…",
  "🧝 Asking the elves for help…",
];

export default function ChatPanel({ activeConversationId, onConversationCreated, onStreamEnd }: Props) {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quipIndex, setQuipIndex] = useState(0);
  const [quipVisible, setQuipVisible] = useState(false);

  // Provider / model state
  const [providers, setProviders] = useState<ProviderInfo[]>([{ id: "ollama", label: "Ollama" }]);
  const [provider, setProvider] = useState<Provider>("ollama");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(OLLAMA_DEFAULT);
  const [modelsLoading, setModelsLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Track which conversation the current displayMessages belong to
  const activeIdRef = useRef<string | null>(null);

  // ── Fetch providers on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/agent/providers")
      .then((r) => r.json())
      .then((data: { providers: ProviderInfo[] }) => {
        if (data.providers.length > 0) setProviders(data.providers);
      })
      .catch(() => {});
  }, []);

  // ── Fetch models when provider changes ────────────────────────────────────
  useEffect(() => {
    setModelsLoading(true);
    fetch(`/api/agent/models?provider=${provider}`)
      .then((r) => r.json())
      .then((data: { models: string[] }) => {
        const list = data.models ?? [];
        setModels(list);
        setModel(list[0] ?? OLLAMA_DEFAULT);
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, [provider]);

  // ── Load messages when active conversation changes ─────────────────────────
  // Only fires when the user explicitly switches to a different conversation.
  // Streaming updates displayMessages in-place; we never re-fetch after a
  // stream ends to avoid clobbering in-flight or just-finished responses.
  useEffect(() => {
    if (activeConversationId === null) {
      setDisplayMessages([]);
      activeIdRef.current = null;
      return;
    }

    // Same conversation as what's already loaded — don't re-fetch.
    if (activeIdRef.current === activeConversationId) return;

    let cancelled = false;
    activeIdRef.current = activeConversationId;

    fetch(`/api/agent/conversations/${activeConversationId}`)
      .then((r) => r.json())
      .then((data: { conversation?: { messages?: { role: string; content: string | null }[] } }) => {
        if (cancelled) return;
        const msgs = (data.conversation?.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as Role, content: m.content ?? "" }));
        setDisplayMessages(msgs);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [activeConversationId]);

  // ── Quip cycling while streaming ──────────────────────────────────────────
  // Each cycle: pop up → hold 2.2s → slide down → pause 0.8s → next
  useEffect(() => {
    if (!streaming) {
      setQuipVisible(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let idx = Math.floor(Math.random() * QUIPS.length);

    const show = () => {
      if (cancelled) return;
      setQuipIndex(idx);
      setQuipVisible(true);
      timer = setTimeout(hide, 2200);
    };

    const hide = () => {
      if (cancelled) return;
      setQuipVisible(false);
      idx = (idx + 1) % QUIPS.length;
      timer = setTimeout(show, 10000);
    };

    show();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [streaming]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setDisplayMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          message: text,
          conversationId: activeIdRef.current ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setDisplayMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "⚠️ Agent unavailable." },
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
          try {
            const parsed = JSON.parse(payload) as
              | { conversationId: string }
              | { token: string }
              | { error: string };

            if ("conversationId" in parsed) {
              activeIdRef.current = parsed.conversationId;
              onConversationCreated(parsed.conversationId, {
                provider,
                model,
                label: text.slice(0, 40),
              });
            } else if ("token" in parsed) {
              accumulated += parsed.token;
              setDisplayMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: accumulated },
              ]);
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch {
      setDisplayMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Network error reaching the agent." },
      ]);
    } finally {
      setStreaming(false);
      onStreamEnd?.();
    }
  }, [input, streaming, provider, model, onConversationCreated, onStreamEnd]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* Provider + Model picker */}
      <div
        className="px-3 py-1.5 flex items-center gap-2 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid #292524" }}
      >
        <span className="text-xs shrink-0" style={{ color: "#78716c" }}>Provider:</span>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          disabled={streaming}
          className="text-xs rounded px-2 py-1 outline-none disabled:opacity-50"
          style={{ background: "#1c1917", color: "#e7e5e4", border: "1px solid #3c3836" }}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

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
            style={{ background: "#1c1917", color: "#e7e5e4", border: "1px solid #3c3836" }}
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
        {displayMessages.length === 0 && (
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

        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed break-words"
              style={
                msg.role === "user"
                  ? { background: "#92400e", color: "#fef3c7", borderBottomRightRadius: "4px" }
                  : { background: "#1c1917", color: "#e7e5e4", border: "1px solid #292524", borderBottomLeftRadius: "4px" }
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quip bubble */}
      <div
        className="px-3 shrink-0 transition-all duration-500"
        style={{ height: quipVisible ? "28px" : "0px", overflow: "hidden" }}
      >
        <span
          className="inline-block text-xs italic px-2 py-0.5 rounded-full"
          style={{
            background: "#292524",
            color: "#a8a29e",
            border: "1px solid #3c3836",
            opacity: quipVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {QUIPS[quipIndex]}
        </span>
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
