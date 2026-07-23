"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Hero, Monster } from "@/lib/types";

interface HeroResults {
  heroes: Hero[];
  query: string | null;
  count: number;
}

interface MonsterResults {
  monsters: Monster[];
  query: string | null;
  count: number;
}

interface Props {
  collection: "heroes" | "monsters";
  onResults: (results: Hero[] | Monster[]) => void;
  placeholder?: string;
}

export default function SearchBar({ collection, onResults, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url = q
          ? `/api/${collection}?q=${encodeURIComponent(q)}`
          : `/api/${collection}`;
        const res = await fetch(url);
        const data = await res.json();
        if (collection === "heroes") {
          const typed = data as HeroResults;
          setCount(typed.count);
          onResults(typed.heroes);
        } else {
          const typed = data as MonsterResults;
          setCount(typed.count);
          onResults(typed.monsters);
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(val), 300);
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder ?? `Search ${collection}…`}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
            …
          </span>
        )}
      </div>
      {count !== null && (
        <p className="text-xs text-gray-400">
          {count} result{count !== 1 ? "s" : ""} from{" "}
          <span className="text-yellow-400 font-mono">{collection}</span>
        </p>
      )}
    </div>
  );
}
