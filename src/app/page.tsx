"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { VenueEntry } from "@/types";
import { useVenueData } from "@/hooks/useVenueData";
import { useGeolocation } from "@/hooks/useGeolocation";
import { computeOccupancy, getSingaporeTime } from "@/lib/occupancy-engine";
import { getCurrentSemester } from "@/lib/calendar";
import { findNearestCluster, clusterDistance } from "@/lib/cluster-map";
import { clearCache } from "@/lib/venue-cache";
import type { RoomType } from "@/lib/room-classify";
import LocationPrompt from "@/components/LocationPrompt";
import RoomGrid from "@/components/RoomGrid";
import VenueDetail from "@/components/VenueDetail";

const NEAR_ME_LIMIT = 60;

export default function Home() {
  const { data, venues, loading, error, refreshing, lastUpdated, refresh } =
    useVenueData();
  const geo = useGeolocation();

  const [now, setNow] = useState<Date>(() => getSingaporeTime());
  const [cluster, setCluster] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [showAllNear, setShowAllNear] = useState(false);
  const [detailVenue, setDetailVenue] = useState<[string, VenueEntry] | null>(null);
  const autoRequested = useRef(false);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(getSingaporeTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-request location on first visit so "near me" works immediately.
  useEffect(() => {
    if (autoRequested.current) return;
    autoRequested.current = true;
    geo.requestLocation();
  }, [geo]);

  const handleAutoDetect = useCallback(() => {
    geo.requestLocation();
  }, [geo]);

  const detectedCluster = useMemo(
    () =>
      geo.lat != null && geo.lng != null
        ? findNearestCluster(geo.lat, geo.lng)
        : null,
    [geo.lat, geo.lng]
  );

  const semester = useMemo(
    () => (data?._calendar ? getCurrentSemester(data._calendar) : null),
    [data]
  );

  // Occupancy for every venue at the current tick.
  const withOccupancy = useMemo(
    () =>
      venues.map(([code, entry]) => ({
        code,
        entry,
        occ: computeOccupancy(entry, now, semester),
      })),
    [venues, now, semester]
  );

  // Browse mode (a cluster pill or search query is active).
  const browsing = Boolean(cluster || search.trim());

  // Near-me: all vacant rooms ranked by nearness then longest free block.
  const nearMe = useMemo(() => {
    const hasGeo = geo.lat != null && geo.lng != null;
    let vacant = withOccupancy.filter((v) => v.occ.status === "vacant");
    if (roomType) vacant = vacant.filter((v) => v.entry.type === roomType);
    vacant.sort((a, b) => {
      if (hasGeo) {
        const da = clusterDistance(a.entry.cluster, geo.lat!, geo.lng!);
        const db = clusterDistance(b.entry.cluster, geo.lat!, geo.lng!);
        if (da !== db) return da - db;
      }
      const fa = a.occ.freeMinutes ?? 0;
      const fb = b.occ.freeMinutes ?? 0;
      if (fb !== fa) return fb - fa;
      return a.code.localeCompare(b.code);
    });
    return vacant;
  }, [withOccupancy, geo.lat, geo.lng, roomType]);

  // Browse filter: cluster + fuzzy search.
  const filtered = useMemo(() => {
    let result = withOccupancy;
    if (cluster) result = result.filter((v) => v.entry.cluster === cluster);
    if (roomType) result = result.filter((v) => v.entry.type === roomType);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      result = result.filter((v) => v.code.toUpperCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const rank = (s: string) => (s === "vacant" ? 0 : 1);
      const r = rank(a.occ.status) - rank(b.occ.status);
      if (r !== 0) return r;
      return a.code.localeCompare(b.code);
    });
  }, [withOccupancy, cluster, search, roomType]);

  const nearShown = showAllNear ? nearMe : nearMe.slice(0, NEAR_ME_LIMIT);

  return (
    <>
      {/* Brand banner */}
      <header className="sticky top-0 z-20 border-b border-nus-orange/40 bg-nus-blue shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-nus-orange" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              NUS <span className="text-nus-orange">SpaceFinder</span>
            </h1>
          </div>
          <span className="font-mono text-xs tabular-nums text-white/70">
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
            <p className="text-sm text-zinc-500">Loading live venue data…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="glass border border-red-200 py-8 text-center">
            <p className="text-sm text-red-600">
              Couldn’t load venue data: {error}
            </p>
            <button
              onClick={() => refresh()}
              className="mt-3 rounded-lg bg-nus-blue px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main UI (loaded) */}
        {!loading && !error && (
          <>
            {/* Semester gap banner */}
            {!semester && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Currently between semesters — all rooms shown as free. Special
                term or exam bookings may not be reflected.
              </div>
            )}

            <LocationPrompt
              allVenues={venues}
              activeCluster={cluster}
              searchQuery={search}
              detectedCluster={detectedCluster}
              geoError={geo.error}
              activeType={roomType}
              onTypeSelect={setRoomType}
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
              {browsing ? (
                <>
                  <p className="mb-3 text-xs text-zinc-500">
                    {filtered.length} room{filtered.length !== 1 ? "s" : ""}
                    {cluster ? ` in ${cluster}` : ""}
                    {roomType ? ` · ${roomType}` : ""}
                    {search ? ` matching “${search}”` : ""}
                  </p>
                  <RoomGrid
                    venues={filtered.map((v) => [v.code, v.entry])}
                    now={now}
                    semester={semester}
                    emptyMessage="No rooms match your search."
                    onVenueSelect={(v, e) => setDetailVenue([v, e])}
                  />
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-end justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800">
                        Available now near you
                      </h2>
                      <p className="text-xs text-zinc-500">
                        {detectedCluster
                          ? `${nearMe.length} free · nearest: ${detectedCluster}`
                          : `${nearMe.length} free · enable location to sort by nearness`}
                        {roomType ? ` · ${roomType}` : ""}
                      </p>
                    </div>
                  </div>

                  <RoomGrid
                    venues={nearShown.map((v) => [v.code, v.entry])}
                    now={now}
                    semester={semester}
                    emptyMessage="No free rooms right now."
                    onVenueSelect={(v, e) => setDetailVenue([v, e])}
                  />

                  {nearMe.length > NEAR_ME_LIMIT && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowAllNear((s) => !s)}
                        className="rounded-full border border-nus-blue/30 bg-white/60 px-4 py-1.5 text-sm font-medium text-nus-blue transition-colors hover:bg-nus-blue/5"
                      >
                        {showAllNear
                          ? "Show fewer"
                          : `Show all ${nearMe.length} free rooms`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-4 border-t border-zinc-200/60 py-4 text-center text-xs text-zinc-400">
        <p>
          Data from{" "}
          <a
            href="https://nusmods.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-nus-blue"
          >
            NUSMods
          </a>
          {lastUpdated
            ? ` · updated ${new Date(lastUpdated).toLocaleString("en-SG", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : " · offline snapshot"}
        </p>
        <button
          onClick={async () => {
            await clearCache();
            refresh();
          }}
          disabled={refreshing}
          className="mt-2 text-zinc-400 underline hover:text-nus-blue disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh data / clear cache"}
        </button>
      </footer>

      {/* Venue detail modal */}
      {detailVenue && (
        <VenueDetail
          venue={detailVenue[0]}
          entry={detailVenue[1]}
          now={now}
          semester={semester}
          onClose={() => setDetailVenue(null)}
        />
      )}
    </>
  );
}
