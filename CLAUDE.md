# CLAUDE.md

## Project Overview

Smart Campus Room Finder (NUS SpaceFinder) — a mobile-first PWA for NUS students to find available rooms on campus in real time. Compresses NUSMods API timetable data into a static JSON matrix via a daily GitHub Actions cron, then computes occupancy entirely client-side using the browser's local clock.

## Tech Stack

- **Framework:** Next.js 16 (React, App Router), deployed on Vercel
- **Styling:** Tailwind CSS v4, glassmorphic design system with NUS corporate colors
- **Data Pipeline:** Python 3 script (urllib + json stdlib) → GitHub Actions cron → static JSON
- **Data Source:** NUSMods API v2 (`https://api.nusmods.com/v2/{year}-{year+1}/`)

## Current State

Both milestones complete. Ready for deployment.

## Project Structure

```
src/
  app/            — Next.js App Router pages (layout.tsx, page.tsx, globals.css)
  components/     — UI: LocationPrompt, RoomGrid, RoomCard, StatusBadge, VenueDetail, ServiceWorkerRegister
  lib/            — occupancy-engine.ts, calendar.ts, cluster-map.ts
  hooks/          — useGeolocation.ts, useVenueData.ts
  types/          — index.ts (TimetableSlot, VenueEntry, OccupancyInfo, etc.)
  data/           — clusters.ts (faculty GPS coordinates)
public/           — venues_timetable.json, manifest.json, sw.js, icon.svg
scripts/          — parse_nusmods.py
.github/workflows — daily_sync.yml
```

## Key Design Decisions

### Data Pipeline
- Parser downloads `moduleList.json` for module index (~588 KB), then fetches individual module files in parallel (16 workers, ThreadPoolExecutor, ~10 min for 6937 modules)
- Academic year auto-detected from current date (August cutoff); override with `--year`
- Cluster mapping via prefix rules: COM→Computing, E1/E2/EA→Engineering, UT→UTown, etc.
- Semester dates: Sem 1 starts 2nd Monday of August, Sem 2 starts 2nd Monday of January, each 17 weeks
- `title` and `type` fields stripped from output to minimize JSON size
- Only semesters 1 and 2 are processed (no special terms)
- Venues prefixed with `E-LEARN_`, `ONLINE`, `TBA`, or `_` are excluded
- Output: `_meta` (stats), `_calendar` (semester dates), then venue entries

### Occupancy Engine
- Singapore time via `Intl` with `Asia/Singapore` timezone
- Slot matching: checks current HHMM against today's slots for the current semester + week
- Between semesters: banner shown, all rooms display as vacant
- 30-second live tick for status updates

### Frontend
- Before-semester-gap banner when no semester is active
- Venue data fetched once, cached in sessionStorage across navigations
- Cluster filter + fuzzy search (simple includes match)
- Geolocation auto-detect maps coords to nearest cluster
- Service worker caches app shell + venue data for offline
- Tapping a room opens a detail modal with full day/week schedule

## Commands

```bash
# Dev
npm run dev

# Build
npm run build

# Run parser (auto-detect year)
python scripts/parse_nusmods.py

# Run parser (specific year)
python scripts/parse_nusmods.py --year 2026-2027
```
