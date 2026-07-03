"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VenueMatrix, VenueEntry } from "@/types";
import { fetchVenueData, fetchCompactedSnapshot } from "@/lib/nusmods";
import { readCache, writeCache, isStale } from "@/lib/venue-cache";

interface VenueDataState {
  data: VenueMatrix | null;
  venues: [string, VenueEntry][];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: number | null;
}

const FALLBACK_URL = "/venues_timetable.json";

export function useVenueData() {
  const [state, setState] = useState<VenueDataState>({
    data: null,
    venues: [],
    loading: true,
    error: null,
    refreshing: false,
    lastUpdated: null,
  });
  const mounted = useRef(true);

  const applyMatrix = useCallback(
    (data: VenueMatrix, fetchedAt: number | null, refreshing: boolean) => {
      if (!mounted.current) return;
      setState({
        ...fromMatrix(data),
        refreshing,
        lastUpdated: fetchedAt,
      });
    },
    []
  );

  // Fetch fresh data, persist, and update state. Tries our own compacted,
  // edge-cached snapshot first (Tier 0); falls back to a direct NUSMods+
  // GitHub fetch (Tier 1, the original behavior) if that's unavailable; and
  // finally to the bundled offline snapshot (Tier 2) if both fail and there
  // is no existing cache to fall back on.
  const revalidate = useCallback(
    async (hadCache: boolean) => {
      if (mounted.current) {
        setState((s) => ({ ...s, refreshing: true }));
      }

      // Tier 0: our own compacted, edge-cached snapshot.
      try {
        const fresh = await fetchCompactedSnapshot();
        await writeCache(fresh);
        applyMatrix(fresh, Date.now(), false);
        return;
      } catch {
        /* fall through to Tier 1 */
      }

      try {
        const fresh = await fetchVenueData();
        await writeCache(fresh);
        applyMatrix(fresh, Date.now(), false);
      } catch (err) {
        if (hadCache) {
          // Keep showing cached data; just stop the spinner.
          if (mounted.current) setState((s) => ({ ...s, refreshing: false }));
          return;
        }
        // No cache and live fetch failed — try the bundled snapshot.
        try {
          const res = await fetch(FALLBACK_URL);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const snapshot = (await res.json()) as VenueMatrix;
          applyMatrix(snapshot, null, false);
        } catch (fallbackErr) {
          if (mounted.current) {
            setState((s) => ({
              ...s,
              loading: false,
              refreshing: false,
              error: (err as Error).message || (fallbackErr as Error).message,
            }));
          }
        }
      }
    },
    [applyMatrix]
  );

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const cached = await readCache();
      if (cached) {
        applyMatrix(cached.data, cached.fetchedAt, false);
        if (isStale(cached.fetchedAt)) revalidate(true);
      } else {
        await revalidate(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [applyMatrix, revalidate]);

  const refresh = useCallback(() => revalidate(false), [revalidate]);

  return { ...state, refresh };
}

function fromMatrix(data: VenueMatrix) {
  const venues: [string, VenueEntry][] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith("_")) continue;
    venues.push([key, val as VenueEntry]);
  }
  return { data, venues, loading: false, error: null };
}

