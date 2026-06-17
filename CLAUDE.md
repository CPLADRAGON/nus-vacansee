# CLAUDE.md

## Project Overview

Smart Campus Room Finder (NUS SpaceFinder) — a mobile-first PWA for NUS students to find available rooms on campus in real time. The browser fetches NUSMods' per-semester `venueInformation.json` directly (no backend), normalizes it client-side, caches it, and computes occupancy entirely client-side using the browser's local clock.

## Tech Stack

- **Framework:** Next.js 16 (React, App Router), deployed on Vercel
- **Styling:** Tailwind CSS v4, glassmorphic design system with NUS corporate colors
- **Data Pipeline:** None — fully client-side fetch + normalize (no GitHub Actions, no Python)
- **Data Source:** NUSMods API v2 `venueInformation.json` (`https://api.nusmods.com/v2/{year}-{year+1}/semesters/{sem}/venueInformation.json`, CORS-enabled) for availability, plus NUSMods `venues.json` (per-venue coordinates / room names / floors). Map tiles from OneMap (Singapore Land Authority).

## Attribution & Responsible Use

NUSMods is **MIT-licensed** and provides a public API; we use it responsibly
(fetch at most once per ~12h, cached, with a static fallback snapshot). The app
credits NUSMods and OneMap/SLA in the footer, and `ACKNOWLEDGEMENTS.md` contains
the full MIT notice and data-source disclosures. This project is independent and
not affiliated with NUS. Keep these credits intact and avoid hammering the
NUSMods endpoints.

## Current State

Client-side data layer + "available rooms near you" + UI polish complete. Ready for deployment.

## Project Structure

```
src/
  app/            — Next.js App Router pages (layout.tsx, page.tsx, globals.css)
  components/     — UI: LocationPrompt, RoomGrid, RoomCard, StatusBadge, VenueDetail, ServiceWorkerRegister
  lib/            — occupancy-engine.ts, calendar.ts, cluster-map.ts, cluster-rules.ts, nusmods.ts, venue-cache.ts
  hooks/          — useGeolocation.ts, useVenueData.ts
  types/          — index.ts (TimetableSlot, VenueEntry, OccupancyInfo, etc.)
  data/           — clusters.ts (faculty GPS coordinates)
public/           — venues_timetable.json (offline fallback snapshot), manifest.json, sw.js, icon.svg
```

## Key Design Decisions

### Data Layer (client-side)
- `lib/nusmods.ts` fetches both semesters' `venueInformation.json` in parallel and normalizes into the `VenueEntry`/`TimetableSlot` shape; `weeks` is flattened from its three NUSMods encodings (`number[]`, `{start,end,weeks}`, `{start,end,weekInterval}`)
- Academic year + semester dates derived client-side in `lib/calendar.ts` (August cutoff; Sem 1 = 2nd Monday of Aug, Sem 2 = 2nd Monday of Jan, 17 weeks)
- Cluster mapping via prefix rules in `lib/cluster-rules.ts` (ported from the old Python parser): COM→Computing, E1/E2/EA→Engineering, UT→UTown, etc.
- Venues prefixed with `E-LEARN_`, `ONLINE`, `TBA`, or `_` are excluded
- `useVenueData` uses **stale-while-revalidate**: render from IndexedDB cache instantly → refetch from NUSMods only if cache is stale (>12h TTL) → fall back to bundled `/public/venues_timetable.json` snapshot if the network/CORS fails
- `lib/venue-cache.ts` stores the normalized dataset in IndexedDB with a `fetchedAt` timestamp and `DATA_SCHEMA_VERSION`; old caches are purged on version bump; an in-app "Refresh data / clear cache" control wipes IndexedDB + service-worker caches

### Occupancy Engine
- Singapore time via `Intl` with `Asia/Singapore` timezone
- Slot matching: checks current HHMM against today's slots for the current semester + week
- Computes a vacant room's remaining free block (`freeMinutes`, `freeUntil`) for ranking
- Between semesters: banner shown, all rooms display as vacant
- 30-second live tick for status updates

### Frontend
- **Available rooms near you (default view):** auto-requests geolocation on first visit, then lists all currently-vacant rooms ranked by cluster nearness, then by longest remaining free block
- Geolocation denied → ranks vacant rooms by longest free block (no distance)
- Cluster pills + fuzzy search switch to a browse view (overrides near-me)
- Service worker caches app shell + fallback snapshot (same-origin only; live NUSMods data lives in IndexedDB)
- Tapping a room opens a detail modal with full day/week schedule

## Commands

```bash
# Dev
npm run dev

# Build
npm run build
```
