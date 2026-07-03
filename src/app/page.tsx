"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { VenueEntry } from "@/types";
import { useVenueData } from "@/hooks/useVenueData";
import { useGeolocation } from "@/hooks/useGeolocation";
import { computeOccupancy, getSingaporeTime } from "@/lib/occupancy-engine";
import { getCurrentSemester, getCurrentWeek, getPeriodLabel, getHeaderPeriodLabel } from "@/lib/calendar";
import { findNearestCluster, venueDistance } from "@/lib/cluster-map";
import { clearCache } from "@/lib/venue-cache";
import type { RoomType } from "@/lib/room-classify";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecents } from "@/hooks/useRecents";
import LocationPrompt from "@/components/LocationPrompt";
import RoomGrid from "@/components/RoomGrid";
import VenueDetail from "@/components/VenueDetail";
import FeedbackModal from "@/components/FeedbackModal";
import AcknowledgementModal from "@/components/AcknowledgementModal";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="glass py-12 text-center text-sm text-zinc-400">
      Loading map…
    </div>
  ),
});

const NEAR_ME_LIMIT = 60;
const MAP_PIN_LIMIT = 200;

export default function Home() {
  const { venues, loading, error, refreshing, lastUpdated, refresh } =
    useVenueData();
  const geo = useGeolocation();
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const { push: pushRecent } = useRecents();

  const [now, setNow] = useState<Date>(() => getSingaporeTime());
  const [cluster, setCluster] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [minFree, setMinFree] = useState(0);
  const [savedOnly, setSavedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showAllNear, setShowAllNear] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [detailVenue, setDetailVenue] = useState<[string, VenueEntry] | null>(null);
  const autoRequested = useRef(false);

  const userLoc = useMemo(
    () => (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null),
    [geo.lat, geo.lng]
  );

  const openDetail = useCallback(
    (v: string, e: VenueEntry) => {
      setDetailVenue([v, e]);
      pushRecent(v);
    },
    [pushRecent]
  );

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(getSingaporeTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-locate ONLY if permission was already granted (silent, no prompt).
  // For "ask"/unknown states we wait for the user to tap the button — a real
  // user gesture reliably triggers the browser's permission prompt, whereas a
  // gesture-less request on load is often auto-denied by the browser.
  useEffect(() => {
    if (autoRequested.current) return;
    autoRequested.current = true;
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (status.state === "granted") geo.requestLocation();
      })
      .catch(() => {
        /* Permissions API unavailable — wait for the button tap */
      });
  }, [geo]);

  const handleAutoDetect = useCallback(() => {
    geo.requestLocation();
    // Switch into the near-me view regardless of current browsing state, so
    // the button always shows nearby rooms once location resolves (matching
    // the "Near me" pill's behavior). Room-type/duration filters are kept.
    setCluster(null);
    setSearch("");
    setShowAll(false);
    setSavedOnly(false);
  }, [geo]);

  const detectedCluster = useMemo(
    () =>
      geo.lat != null && geo.lng != null
        ? findNearestCluster(geo.lat, geo.lng)
        : null,
    [geo.lat, geo.lng]
  );

  const semester = useMemo(() => getCurrentSemester(now), [now]);
  const periodLabel = useMemo(() => getPeriodLabel(now), [now]);
  const headerLabelFull = useMemo(() => getHeaderPeriodLabel(now, false), [now]);
  const inTeachingWeek = useMemo(() => getCurrentWeek(now) > 0, [now]);
  const inSpecialTerm = semester?.semester === 3 || semester?.semester === 4;

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

  // Browse mode (a cluster pill, search query, the saved filter, or all-venues).
  const browsing = Boolean(cluster || search.trim() || savedOnly || showAll);

  // Near-me: all vacant rooms ranked by nearness then longest free block.
  const nearMe = useMemo(() => {
    const hasGeo = geo.lat != null && geo.lng != null;
    let vacant = withOccupancy.filter((v) => v.occ.status === "vacant");
    if (roomType) vacant = vacant.filter((v) => v.entry.type === roomType);
    if (minFree > 0)
      vacant = vacant.filter((v) => (v.occ.freeMinutes ?? 0) >= minFree);
    vacant.sort((a, b) => {
      if (hasGeo) {
        const da = venueDistance(a.entry, geo.lat!, geo.lng!);
        const db = venueDistance(b.entry, geo.lat!, geo.lng!);
        if (da !== db) return da - db;
      }
      const fa = a.occ.freeMinutes ?? 0;
      const fb = b.occ.freeMinutes ?? 0;
      if (fb !== fa) return fb - fa;
      return a.code.localeCompare(b.code);
    });
    return vacant;
  }, [withOccupancy, geo.lat, geo.lng, roomType, minFree]);

  // Browse filter: cluster + fuzzy search + saved + type + duration.
  const filtered = useMemo(() => {
    let result = withOccupancy;
    if (cluster) result = result.filter((v) => v.entry.cluster === cluster);
    if (roomType) result = result.filter((v) => v.entry.type === roomType);
    if (savedOnly) result = result.filter((v) => favorites.has(v.code));
    if (minFree > 0)
      result = result.filter(
        (v) => v.occ.status === "vacant" && (v.occ.freeMinutes ?? 0) >= minFree
      );
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
  }, [withOccupancy, cluster, search, roomType, savedOnly, minFree, favorites]);

  const nearShown = showAllNear ? nearMe : nearMe.slice(0, NEAR_ME_LIMIT);

  const mapRooms = useMemo(() => {
    const src = browsing ? filtered : nearMe;
    return src
      .slice(0, MAP_PIN_LIMIT)
      .map((v) => ({ code: v.code, entry: v.entry, status: v.occ.status }));
  }, [browsing, filtered, nearMe]);

  return (
    <>
      {/* Brand banner */}
      <header className="sticky top-0 z-40 border-b border-nus-orange/40 bg-nus-blue shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-8 w-1.5 shrink-0 rounded-full bg-nus-orange" />
            <div className="flex flex-col leading-tight">
              <h1 className="text-lg font-bold tracking-tight text-white">
                NUS <span className="text-nus-orange">Vacansee</span>
              </h1>
              <span
                title={headerLabelFull}
                className="whitespace-nowrap font-mono text-[10px] font-medium text-white/60 sm:text-xs"
              >
                {headerLabelFull}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setFeedbackOpen(true)}
              aria-label="Send feedback"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:px-2.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 014 11.5 8.5 8.5 0 0112.5 3 8.38 8.38 0 0121 11.5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden min-[400px]:inline">Feedback</span>
            </button>
            <span className="font-mono text-xs tabular-nums text-white/70">
              {now.toLocaleTimeString("en-SG", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Singapore",
              })}
            </span>
          </div>
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
            {/* Non-teaching-period banner */}
            {!inTeachingWeek && !inSpecialTerm && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="font-semibold">{periodLabel}</span> — no classes
                scheduled, so rooms are shown as free from the timetable. Ad-hoc
                bookings or exams may not be reflected; please verify on site.
              </div>
            )}
            {/* Special-term banner: classes are scheduled but coverage is limited */}
            {inSpecialTerm && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="font-semibold">{periodLabel}</span> — only
                special-term classes are scheduled, so most rooms are free. Ad-hoc
                bookings may not be reflected; please verify on site.
              </div>
            )}

            <LocationPrompt
              allVenues={venues}
              activeCluster={cluster}
              searchQuery={search}
              detectedCluster={detectedCluster}
              geoError={geo.error}
              geoErrorCode={geo.errorCode}
              activeType={roomType}
              onTypeSelect={setRoomType}
              showAll={showAll}
              onShowAll={() => {
                setShowAll(true);
                setCluster(null);
                setSearch("");
                setSavedOnly(false);
              }}
              minFree={minFree}
              onMinFreeSelect={setMinFree}
              savedOnly={savedOnly}
              onToggleSaved={() => setSavedOnly((s) => !s)}
              savedCount={favorites.size}
              onClusterSelect={(c) => {
                setCluster(c);
                setSearch("");
                setShowAll(false);
              }}
              onSearchChange={setSearch}
              onAutoDetect={handleAutoDetect}
              geoLoading={geo.loading}
            />

            {/* View toggle */}
            <div className="mt-4 flex justify-end">
              <div className="inline-flex rounded-full border border-zinc-200 bg-white/60 p-0.5 text-xs font-medium">
                {(["list", "map"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 capitalize transition-colors ${
                      view === v
                        ? "bg-nus-blue text-white"
                        : "text-zinc-500 hover:text-nus-blue"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="mt-3">
              {view === "map" ? (
                <>
                  <p className="mb-3 text-xs text-zinc-500">
                    {mapRooms.length} room{mapRooms.length !== 1 ? "s" : ""} on map
                    {browsing ? "" : " · free now"}
                  </p>
                  <MapView rooms={mapRooms} userLoc={userLoc} onSelect={openDetail} />
                </>
              ) : browsing ? (
                <>
                  <p className="mb-3 text-xs text-zinc-500">
                    {filtered.length} room{filtered.length !== 1 ? "s" : ""}
                    {showAll ? " · all venues" : ""}
                    {savedOnly ? " saved" : ""}
                    {cluster ? ` in ${cluster}` : ""}
                    {roomType ? ` · ${roomType}` : ""}
                    {minFree ? ` · free ≥ ${minFree / 60}h` : ""}
                    {search ? ` matching “${search}”` : ""}
                  </p>
                  <RoomGrid
                    venues={filtered.map((v) => [v.code, v.entry])}
                    now={now}
                    semester={semester}
                    userLoc={userLoc}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    emptyMessage={
                      savedOnly
                        ? "No saved rooms yet — tap the ★ on a room to save it."
                        : "No rooms match your search."
                    }
                    onVenueSelect={openDetail}
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
                        {minFree ? ` · ≥ ${minFree / 60}h` : ""}
                      </p>
                    </div>
                  </div>

                  <RoomGrid
                    venues={nearShown.map((v) => [v.code, v.entry])}
                    now={now}
                    semester={semester}
                    userLoc={userLoc}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    emptyMessage="No free rooms right now."
                    onVenueSelect={openDetail}
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
      <footer className="mt-4 space-y-1 border-t border-zinc-200/60 px-4 py-4 text-center text-xs text-zinc-400">
        <p>
          Timetable &amp; venue data from{" "}
          <a
            href="https://nusmods.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-nus-blue"
          >
            NUSMods
          </a>{" "}
          (MIT) · map ©{" "}
          <a
            href="https://www.onemap.gov.sg/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-nus-blue"
          >
            OneMap
          </a>{" "}
          / Singapore Land Authority
          {lastUpdated
            ? ` · updated ${new Date(lastUpdated).toLocaleString("en-SG", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : " · offline snapshot"}
        </p>
        <p className="text-zinc-300">
          Not affiliated with NUS. Availability is computed from class schedules
          and may not reflect ad-hoc bookings — please verify on site.
        </p>
        <button
          onClick={async () => {
            await clearCache();
            refresh();
          }}
          disabled={refreshing}
          className="mt-1 text-zinc-400 underline hover:text-nus-blue disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh data / clear cache"}
        </button>
        <span className="px-1 text-zinc-300">·</span>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-zinc-400 underline hover:text-nus-blue"
        >
          Send feedback
        </button>
        <span className="px-1 text-zinc-300">·</span>
        <button
          onClick={() => setAckOpen(true)}
          className="text-zinc-400 underline hover:text-nus-blue"
        >
          Acknowledgements
        </button>
        <p className="pt-1 text-zinc-300">
          Built by{" "}
          <button
            onClick={() => setAckOpen(true)}
            className="font-medium text-zinc-400 underline hover:text-nus-blue"
          >
            WANG BOYU
          </button>
        </p>
      </footer>

      {/* Feedback modal */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      {ackOpen && <AcknowledgementModal onClose={() => setAckOpen(false)} />}

      {/* Venue detail modal */}
      {detailVenue && (
        <VenueDetail
          venue={detailVenue[0]}
          entry={detailVenue[1]}
          now={now}
          semester={semester}
          isFavorite={isFavorite(detailVenue[0])}
          onToggleFavorite={toggleFavorite}
          onClose={() => setDetailVenue(null)}
        />
      )}
    </>
  );
}
