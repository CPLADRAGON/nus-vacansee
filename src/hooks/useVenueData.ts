"use client";

import { useState, useEffect } from "react";
import type { VenueMatrix, VenueEntry } from "@/types";

interface VenueDataState {
  data: VenueMatrix | null;
  venues: [string, VenueEntry][];
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = "spacefinder_venues";

export function useVenueData() {
  const [state, setState] = useState<VenueDataState>({
    data: null,
    venues: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: VenueMatrix = JSON.parse(cached);
        setState(fromMatrix(parsed));
        return;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    fetch("/venues_timetable.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: VenueMatrix) => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        setState(fromMatrix(data));
      })
      .catch((err) => {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
  }, []);

  return state;
}

function fromMatrix(data: VenueMatrix) {
  const venues: [string, VenueEntry][] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith("_")) continue;
    venues.push([key, val as VenueEntry]);
  }
  return { data, venues, loading: false, error: null };
}
