"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Hero, Monster, SearchHit } from "@/lib/types";

interface ApiResponse {
  heroes?: Hero[];
  monsters?: Monster[];
  similarities?: (number | null)[];
  query: string | null;
  count: number;
}

interface Props {
  collection: "heroes" | "monsters";
  onResults: (hits: SearchHit<Hero | Monster>[]) => void;
  placeholder?: string;
}

/** Highlight query terms inside `text`. Returns an array of {text, highlight} segments. */
function highlight(text: string, query: string): { text: string; hi: boolean }[] {
  if (!query.trim()) return [{ text, hi: false }];
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [{ text, hi: false }];
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((p) => ({ text: p, hi: pattern.test(p) }));
}

/** Build a short "match context" snippet from description + ability descriptions. */
function matchSnippet(doc: Hero | Monster, query: string): string | null {
  if (!query.trim()) return null;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return null;

  const candidates: string[] = [doc.description];
  for (const a of doc.abilities ?? []) {
    candidates.push(`${a.name}: ${a.description}`);
  }

  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    if (terms.some((t) => lower.includes(t))) {
      // Return up to 90 chars around the first match
      const idx = Math.max(0, lower.indexOf(terms.find((t) => lower.includes(t))!) - 20);
      const raw = candidate.slice(idx, idx + 90).trim();
      return (idx > 0 ? "…" : "") + raw + (candidate.length > idx + 90 ? "…" : "");
    }
  }
  return null;
}

export default function SearchBar({ collection, onResults, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit<Hero | Monster>[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url = q
          ? `/api/${collection}?q=${encodeURIComponent(q)}`
          : `/api/${collection}`;
        const res = await fetch(url);
        const data: ApiResponse = await res.json();
        const docs: (Hero | Monster)[] =
          collection === "heroes" ? (data.heroes ?? []) : (data.monsters ?? []);
        const sims = data.similarities ?? [];
        const newHits: SearchHit<Hero | Monster>[] = docs.map((doc, i) => ({
          doc,
          similarity: sims[i] ?? null,
        }));
        setHits(newHits);
        onResults(newHits);
      } finally {
        setLoading(false);
      }
    },
    [collection, onResults]
  );

  // Initial load
  useEffect(() => {
    fetchResults("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const hasQuery = query.trim().length > 0;
  const scoredHits = hits.filter((h) => h.similarity !== null);

  return (
    <div className="space-y-1" ref={panelRef}>
      {/* Input row */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder ?? `Search ${collection}…`}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">…</span>
        )}
      </div>

      {/* Count + toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {hits.length} result{hits.length !== 1 ? "s" : ""} from{" "}
          <span className="text-yellow-400 font-mono">{collection}_v2</span>
        </p>
        {hasQuery && scoredHits.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
          >
            {open ? "hide details" : "why these results?"}
          </button>
        )}
      </div>

      {/* Similarity breakdown panel */}
      {open && hasQuery && scoredHits.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 text-xs divide-y divide-gray-800 max-h-72 overflow-y-auto">
          <div className="px-3 py-2 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
            Vector similarity — NVIDIA nv-embedqa-e5-v5
          </div>
          {scoredHits.map((hit, i) => {
            const doc = hit.doc as Hero & Monster;
            const pct = Math.round((hit.similarity ?? 0) * 100);
            const snippet = matchSnippet(doc, query);
            const nameParts = highlight(doc.name, query);
            return (
              <div key={doc._id} className="px-3 py-2 space-y-1">
                {/* Rank + name + score */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 w-4 shrink-0">{i + 1}.</span>
                  <span className="text-white font-medium truncate flex-1">
                    {nameParts.map((p, j) =>
                      p.hi ? (
                        <mark key={j} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p.text}</mark>
                      ) : (
                        <span key={j}>{p.text}</span>
                      )
                    )}
                  </span>
                  <span className="text-yellow-400 font-mono shrink-0">{pct}%</span>
                </div>
                {/* Similarity bar */}
                <div className="w-full h-1 rounded bg-gray-700">
                  <div
                    className="h-1 rounded bg-yellow-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Matched text snippet */}
                {snippet && (
                  <p className="text-gray-400 leading-snug">
                    {highlight(snippet, query).map((p, j) =>
                      p.hi ? (
                        <mark key={j} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p.text}</mark>
                      ) : (
                        <span key={j}>{p.text}</span>
                      )
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
