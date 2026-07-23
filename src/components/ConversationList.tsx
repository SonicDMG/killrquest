"use client";

import type { ConversationDoc } from "@/lib/types";

interface Props {
  conversations: ConversationDoc[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        borderRight: "1px solid #292524",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 shrink-0 flex items-center justify-between gap-2"
        style={{ borderBottom: "1px solid #292524" }}
      >
        <span className="text-xs font-semibold tracking-wide truncate" style={{ color: "#78716c" }}>
          Conversations
        </span>
        <button
          onClick={onNew}
          title="New conversation"
          className="text-xs rounded px-2 py-0.5 shrink-0 transition-opacity hover:opacity-80"
          style={{
            background: "#292524",
            color: "#a8a29e",
            border: "1px solid #3c3836",
            whiteSpace: "nowrap",
          }}
        >
          + New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1" style={{ minHeight: 0 }}>
        {conversations.length === 0 && (
          <p className="text-xs px-3 py-4 text-center" style={{ color: "#57534e" }}>
            No conversations yet.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c._id}
            onClick={() => onSelect(c._id)}
            className="w-full text-left px-3 py-2 text-xs transition-colors"
            style={{
              background: c._id === activeId ? "#292524" : "transparent",
              color: c._id === activeId ? "#e7e5e4" : "#a8a29e",
              borderLeft: c._id === activeId ? "2px solid #b45309" : "2px solid transparent",
            }}
          >
            <div className="truncate font-medium">{c.label || "Untitled"}</div>
            <div className="truncate mt-0.5" style={{ color: "#57534e", fontSize: "10px" }}>
              {c.provider} · {new Date(c.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
