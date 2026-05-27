"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useVenueData } from "@/hooks/useVenueData";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getSingaporeTime } from "@/lib/occupancy-engine";
import { getCurrentSemester } from "@/lib/calendar";
import { findNearestCluster } from "@/lib/cluster-map";
import LocationPrompt from "@/components/LocationPrompt";
import RoomGrid from "@/components/RoomGrid";

export default function Home() {
  const { data, venues, loading, error } = useVenueData();
  const geo = useGeolocation();

  const [now, setNow] = useState<Date>(() => getSingaporeTime());
  const [cluster, setCluster] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(getSingaporeTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-detect: find nearest cluster from geolocation
  const handleAutoDetect = useCallback(() => {
    geo.requestLocation();
  }, [geo]);

  useEffect(() => {
    if (geo.lat != null && geo.lng != null) {
      const nearest = findNearestCluster(geo.lat, geo.lng);
      setCluster(nearest);
      setSearch("");
    }
  }, [geo.lat, geo.lng]);

  const semester = useMemo(
    () => (data?._calendar ? getCurrentSemester(data._calendar) : null),
    [data]
  );

  // Filter venues by cluster + search
  const filtered = useMemo(() => {
    let result = venues;

    if (cluster) {
      result = result.filter(([, e]) => e.cluster === cluster);
    }

    if (search.trim()) {
      const q = search.trim().toUpperCase();
      result = result.filter(([code]) => code.toUpperCase().includes(q));
    }

    // Sort: vacant first, then by code
    if (semester) {
      const nowSort = now;
      result = [...result].sort((a, b) => {
        const occA = a[1]; // VenueEntry
        const occB = b[1];
        // Simple heuristic: venues with fewer today-slots → more likely vacant
        const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][nowSort.getDay()];
        const slotsA = ((occA as any)[dayName]?.length ?? 0);
        const slotsB = ((occB as any)[dayName]?.length ?? 0);
        return slotsA - slotsB || a[0].localeCompare(b[0]);
      });
    }

    return result;
  }, [venues, cluster, search, semester, now]);

  const hasSelection = cluster || search.trim();

  return (
    <>
      {/* Brand banner */}
      <header className="sticky top-0 z-20 border-b border-nus-orange/30 bg-nus-blue">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight text-white">
            NUS SpaceFinder
          </h1>
          <span className="text-xs text-white/60">
            {now.toLocaleTimeString("en-SG", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Singapore",
            })}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {/* Loading state */}
        {loading && (
          <div className="glass py-12 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-nus-blue border-t-transparent" />
            <p className="text-sm text-zinc-400">Loading venue data...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="glass border border-red-200 py-8 text-center">
            <p className="text-sm text-red-600">
              Failed to load venue data: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-nus-blue px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main UI (loaded) */}
        {!loading && !error && (
          <>
            <LocationPrompt
              allVenues={venues}
              activeCluster={cluster}
              searchQuery={search}
              onClusterSelect={(c) => {
                setCluster(c);
                setSearch("");
              }}
              onSearchChange={setSearch}
              onAutoDetect={handleAutoDetect}
              geoLoading={geo.loading}
            />

            {/* Results */}
            <div className="mt-4">
              {!hasSelection && venues.length > 0 && (
                <div className="glass py-8 text-center">
                  <p className="text-sm text-zinc-400">
                    Select a cluster above or search for a room to see availability.
                  </p>
                </div>
              )}

              {hasSelection && (
                <>
                  <p className="mb-3 text-xs text-zinc-400">
                    {filtered.length} room{filtered.length !== 1 ? "s" : ""}
                    {cluster ? ` in ${cluster}` : ""}
                    {search ? ` matching "${search}"` : ""}
                  </p>

                  <RoomGrid
                    venues={filtered}
                    now={now}
                    semester={semester}
                    emptyMessage="No rooms match your search."
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 py-4 text-center text-xs text-zinc-400">
        Data from{" "}
        <a
          href="https://nusmods.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-nus-blue"
        >
          NUSMods
        </a>
        . Updated daily.
      </footer>
    </>
  );
}
