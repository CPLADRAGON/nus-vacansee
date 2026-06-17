"use client";

import { useState, useEffect, useCallback } from "react";

const FAV_KEY = "vacansee_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((code: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (code: string) => favorites.has(code),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
}
