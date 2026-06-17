"use client";

import { useState, useEffect, useCallback } from "react";

const RECENT_KEY = "vacansee_recents";
const CAP = 8;

export function useRecents() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const push = useCallback((code: string) => {
    setRecents((prev) => {
      const next = [code, ...prev.filter((c) => c !== code)].slice(0, CAP);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { recents, push };
}
