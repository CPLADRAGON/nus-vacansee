"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { CLUSTERS } from "@/data/clusters";
import type { VenueEntry } from "@/types";

interface Props {
  allVenues: [string, VenueEntry][];
  activeCluster: string | null;
  searchQuery: string;
  onClusterSelect: (cluster: string | null) => void;
  onSearchChange: (q: string) => void;
  onAutoDetect: () => void;
  geoLoading: boolean;
}

const HARDCODED_PILLS = [
  { id: null, label: "All" },
  { id: "Computing", label: "COM" },
  { id: "Engineering", label: "ENG" },
  { id: "UTown", label: "UTown" },
  { id: "FASS", label: "FASS" },
];

export default function LocationPrompt({
  allVenues,
  activeCluster,
  searchQuery,
  onClusterSelect,
  onSearchChange,
  onAutoDetect,
  geoLoading,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const q = searchQuery.toUpperCase();
    return allVenues
      .filter(([code]) => code.toUpperCase().includes(q))
      .slice(0, 10)
      .map(([code]) => code);
  }, [allVenues, searchQuery]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="glass space-y-4 p-4">
      {/* Auto-detect row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAutoDetect}
          disabled={geoLoading}
          className="flex items-center gap-2 rounded-lg bg-nus-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {geoLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span>📍</span>
          )}
          Auto-Detect Cluster
        </button>
        <span className="text-xs text-zinc-400">
          or select below
        </span>
      </div>

      {/* Cluster pills */}
      <div className="flex flex-wrap gap-2">
        {HARDCODED_PILLS.map((pill) => (
          <button
            key={pill.id ?? "__all"}
            onClick={() => onClusterSelect(pill.id)}
            className={`rounded-full border px-3.5 py-1 text-sm font-medium transition-all ${
              activeCluster === pill.id
                ? "border-nus-blue bg-nus-blue text-white"
                : "border-zinc-200 bg-white/60 text-zinc-600 hover:border-nus-blue hover:text-nus-blue"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search building, block or LT code (e.g., E3, COM1)..."
          className="w-full rounded-lg border border-zinc-200 bg-white/60 px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-nus-orange"
        />
        {focused && suggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            {suggestions.map((code) => (
              <li
                key={code}
                onClick={() => {
                  onSearchChange(code);
                  setFocused(false);
                }}
                className="cursor-pointer px-4 py-2 font-mono text-sm text-zinc-700 hover:bg-nus-blue/5 hover:text-nus-blue"
              >
                {code}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
