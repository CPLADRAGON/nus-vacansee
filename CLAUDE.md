# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Campus Room Finder (NUS SpaceFinder) — a mobile-first web app for NUS students to find available rooms on campus in real time. Compresses NUSMods API timetable data into a static JSON matrix via a daily GitHub Actions cron, then computes occupancy entirely client-side using the browser's local clock.

## Current State

Milestone 1 complete (data pipeline). Next: Milestone 2 (Next.js frontend).

Files:
- `design.md` — Full design and architecture specification
- `scripts/parse_nusmods.py` — Python parser (stdlib only, no pip dependencies)
- `.github/workflows/daily_sync.yml` — GitHub Actions cron (runs daily 04:00 SGT)
- `venues_timetable.json` (generated) — Venue occupancy matrix (~7 MB)

## Tech Stack

- **Framework:** Next.js (React, App Router), deployed on Vercel/Netlify
- **Styling:** Tailwind CSS, glassmorphic design system with NUS corporate colors
- **Data Pipeline:** Python script (urllib + json stdlib) → GitHub Actions cron → static `venues_timetable.json`
- **Data Source:** NUSMods API v2 (`https://api.nusmods.com/v2/{year}-{year+1}/`)

## Key Design Decisions

### Data Pipeline
- Parser downloads `moduleList.json` for module index, then fetches individual module files in parallel (16 workers, ThreadPoolExecutor)
- `moduleInfo.json` does NOT contain timetable data; individual `/modules/{code}.json` files do
- `weeks` field in API is already an integer array (no weekRange string parsing needed)
- Academic year computed from current date (August cutoff); can be overridden with `--year`
- Cluster mapping via prefix rules in `CLUSTER_RULES` list (ordered most-specific first)
- Semester dates computed dynamically (2nd Monday of August / January, 17-week semesters)
- Output includes `_meta` (generation timestamp, counts) and `_calendar` (semester date ranges)

### Venue Matrix Structure
```json
{
  "_meta": { "generated_at": "...", "academic_year": "2025-2026", "venue_count": 648, "module_count": 6937 },
  "_calendar": { "2025-2026": { "1": { "start": "2025-08-11", "end": "2025-12-07" }, "2": { "start": "2026-01-12", "end": "2026-05-10" } } },
  "COM1-0206": {
    "cluster": "Computing",
    "Monday": [{ "start": "0900", "end": "1100", "module": "CS1101S", "title": "Programming Methodology", "type": "Lecture", "semester": 1, "weeks": [3,4,5,6,7,8,9,10,11,12,13] }]
  }
}
```

### Parser Details
- Venues prefixed with `E-LEARN_`, `ONLINE`, `TBA`, or `_` are excluded
- Only semesters 1 and 2 are processed (no special terms)
- Entries with non-integer week values (`["end", "start"]`) are filtered out
- Output is 7.4 MB uncompressed, ~4-5 MB compact (indent=2 is used for readability)

## Commands

```bash
# Run the parser (auto-detect academic year)
python scripts/parse_nusmods.py

# Run for a specific academic year
python scripts/parse_nusmods.py --year 2026-2027

# Run with custom output path
python scripts/parse_nusmods.py --output my/path/venues.json
```

## Implementation Roadmap

1. Done: `scripts/parse_nusmods.py` — Python parser for NUSMods API
2. Done: `.github/workflows/daily_sync.yml` — GitHub Actions cron workflow
3. Next: Next.js app with Tailwind + glassmorphic theme tokens
4. Next: Client-side occupancy engine (clock + matrix matching + geolocation sorting)
5. Next: PWA manifest + vanilla service worker
