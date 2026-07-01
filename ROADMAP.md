# NUS Vacansee — Roadmap & Deployment Evaluation

_Last updated: 2026-07-01 · Living document_

This document captures (1) an honest evaluation of whether the current
deployment can scale to real student usage, and (2) a prioritized roadmap to
turn Vacansee from a working prototype into a tool NUS students actually rely on.

It is informed by reviewing **NUSMods** (its public API, venue data, and the
"use responsibly" guidance), the **OneMap** basemap dependency, common
university "free-room finder" patterns, and direct measurements of our data
dependencies.

---

## 1. Where we are today

**What works**
- Fully client-side: the browser fetches NUS timetable + venue data, computes
  occupancy with the local clock, and renders everything (no backend).
- "Available now near you" ranking, live status, NUSMods-style weekly timetable,
  room type + approximate capacity, cluster/type/duration/saved filters, search,
  Google Maps directions, an OneMap map view, favorites/recents, installable PWA.
- Attribution to NUSMods (MIT) and OneMap/SLA; in-app feedback.

**Core limitation (the thing that decides adoption):** availability is inferred
from **class timetables only**. It does **not** know about ad-hoc bookings, CCA
usage, events, maintenance, locked/card-access rooms, or building opening hours.
A student who walks to a "free" room and finds it occupied or locked loses trust
fast. **Accuracy & trust is the #1 product risk** — see §4.

---

## 2. Deployment & scalability evaluation

### 2.1 Architecture in one line
Static Next.js SPA on Vercel + browser-side fetch of third-party data
(NUSMods API, GitHub raw, OneMap tiles) cached in IndexedDB (~12h).

### 2.2 Measured facts (2026-06-17)
| Dependency | Source | Size | Caching | Risk |
|---|---|---|---|---|
| `venueInformation.json` (×2 semesters) | `api.nusmods.com` (Cloudflare) | ~2.13 MB each (~4.3 MB total) | `cache-control: null`, `cf-cache-status: DYNAMIC` (origin-served, **not** edge-cached) | **High** at scale |
| `venues.json` (coords/room names) | `raw.githubusercontent.com` | ~0.11 MB | `max-age=300` | **Medium** (GitHub raw is rate-limited, not for production) |
| Map tiles | `onemap.gov.sg` | ~17 KB/tile | `max-age=14400` (4h) | **Medium** (external rate limits / ToS) |
| App shell + JS | Vercel edge | small (static SPA) | hashed/immutable | **Low** |

### 2.3 Verdict
- **Our hosting scales well.** The app is a static SPA; Vercel serves a few
  hundred KB per first load (then cached). Vercel's free (Hobby) bandwidth
  comfortably handles hundreds of thousands of first-loads/month. Client-side
  compute runs on user devices, so it scales for free.
- **The third-party data path does not scale responsibly.** Because
  `venueInformation.json` is **DYNAMIC (uncached)** and ~4.3 MB per refresh,
  every active user pulls ~4.3 MB from NUSMods' origin every ~12h. At, say,
  10,000 daily active users that's on the order of **tens of GB/day hitting
  NUSMods' origin** — slow on mobile data and not aligned with NUSMods' "use
  responsibly" request. `venues.json` via GitHub raw can be throttled outright.

### 2.4 Recommended infra change (high priority)
Introduce a **build-time / scheduled data pipeline that we host ourselves**:

1. A scheduled job (Vercel Cron, or a GitHub Action with correct
   `permissions: contents: write`) runs ~daily:
   - Fetches both semesters' `venueInformation.json` + `venues.json`.
   - **Merges + compacts** into one small JSON (strip unused fields; keep
     day/start/end/weeks/module + cluster + type + capacity + lat/lng/roomName).
     Expected size: **~300–600 KB** vs ~4.3 MB (≈ 85–90% smaller).
   - Writes it to `/public` (or Vercel Blob) served from **our** CDN.
2. The client fetches **our** compacted snapshot (edge-cached, immutable per day)
   instead of hitting NUSMods/GitHub directly.

**Benefits:** ~10× smaller payload, fast on mobile, removes the GitHub-raw rate
limit, and reduces NUSMods origin load from "per user" to "once per day for the
whole app" — far more responsible and far more scalable. Keep a same-day live
fallback to NUSMods only if our snapshot is missing.

### 2.5 Other infra notes
- **Vercel Hobby is non-commercial.** A free student tool is generally fine; if
  it grows or is monetized, move to Vercel Pro or **Cloudflare Pages / GitHub
  Pages** (both free, generous for static SPAs).
- **OneMap**: keep attribution; register for an API key if tile volume grows or
  ToS requires it. Consider a fallback basemap.
- We removed the service worker (it caused stale-code issues). If we re-add
  offline support later, ship a **versioned, network-first** worker with a tested
  update path (we already learned this the hard way).
- Add lightweight, privacy-respecting analytics (e.g., Plausible/Umami) to
  understand real usage and guide the roadmap.

---

## 3. Feature roadmap

Phased by impact-vs-effort. "Now" items most directly make Vacansee trustworthy
and usable; "Later" items are platform bets.

### 3.1 Now (accuracy, trust, scale) — highest priority
- **Self-hosted compacted data pipeline** (see §2.4) — scale + speed + responsibility.
- **Building opening hours & access awareness.** Mark rooms as
  "open / card-access only / closed" by time of day and day of week; many NUS
  buildings are locked or card-only after hours. Prevents the worst false
  positives.
- ~~**Calendar awareness beyond term:** handle **reading/exam weeks, vacation,
  public holidays, and special terms**.~~ **Done (2026-06-30).** Ported NUSMods'
  `nusmoderator` academic calendar logic; the app now correctly resolves Sem 1,
  Sem 2, Special Terms (3 & 4), recess, reading, and exam weeks via date-based
  scheduling. A banner warns users during periods where timetable data is sparse.
- **Crowd-sourced ground truth.** A one-tap "Is this room actually free?"
  (Free / Occupied / Locked) on the detail page that feeds a short-lived live
  signal shown to others ("2 students reported this occupied 5 min ago"). This
  bridges timetable-vs-reality cheaply (needs a tiny backend or a serverless
  function + KV store).
- ~~**Trust UI:** always-visible "last updated", a clear "computed from class
  timetables — verify on site" note, and a confidence indicator.~~ **Partially
  done (2026-06-30).** Honest timetable states (vacant / class ending soon /
  free later), "please verify on site" caveat in the Special Term banner, and
  graceful class labels with lesson type + class number. Remaining: per-venue
  "last refreshed" timestamp and a formal confidence indicator.

### 3.2 Next (usability depth)
- **Capacity / "seats ≥ N" filter** and **accessibility info** (lift access,
  wheelchair-friendly) where data exists.
- **Plan-ahead time picker:** "what's free at 2pm?" / "free for my 1-hour gap."
- **Smarter search:** building aliases, fuzzy matching, recents in search.
- **Library seat availability** integration (NUS Libraries publishes live seat
  counts) — a top student need for study spots.
- **Indoor/last-leg guidance:** building entrance pin + floor/room hints
  (we already store `roomName` + `floor`).
- **Re-introduce a robust offline PWA** (versioned network-first SW) now that the
  data is small and self-hosted.
- **Personalization:** remember preferred clusters, default duration, dark mode.

### 3.3 Later (platform & partnerships)
- **Official data / booking integration.** Partner with NUS facilities or
  integrate the official room-booking system for ground-truth availability and
  even in-app booking — the single biggest credibility unlock.
- **Push notifications:** "a room near you just freed up" (note: iOS PWA push is
  limited; may need careful UX or a native shell).
- **Crowd / busyness levels** for common areas and study clusters.
- **Group coordination:** share a room/spot with friends, "meet here" links.
- **Facilities analytics** (aggregate, anonymized) potentially useful to the
  university for space planning.

---

## 4. The #1 risk: accuracy & trust (read this first)

Timetable-based availability is necessary but **not sufficient**. The product
stands or falls on whether a "free" room is actually free and accessible. The
cheapest high-leverage mitigations, in order:

1. **Honest caveats + last-updated** (done partially) — set expectations.
2. **Opening hours / access state** — eliminate "locked room" false positives.
3. **Crowd-sourced confirmations** — cheap real-time correction layer.
4. ~~**Special-period handling** (exams/vacation) — avoid confidently-wrong states.~~ **Done.**
5. **Official data** — the eventual source of truth.

Ship 1–3 before heavy marketing; otherwise early users churn after one bad walk.

---

## 5. Suggested next concrete step

Build the **self-hosted compacted data pipeline (§2.4)**. It is the single change
that simultaneously: (a) makes the app fast on mobile, (b) makes us a responsible
NUSMods consumer, (c) removes the GitHub-raw rate-limit risk, and (d) unblocks
everything else (a stable, small, owned dataset is the foundation for opening
hours, crowd-sourcing, and offline). It is well-scoped and low-risk.

---

## 6. Open questions / decisions

- Is a small backend acceptable (for crowd-sourced reports + scheduled pipeline),
  or do we stay strictly static? (A single serverless function + KV is enough.)
- Hosting: stay on Vercel Hobby, or move static hosting to Cloudflare/GitHub
  Pages for headroom and clearer ToS?
- Do we pursue an official NUS data/partnership track, or remain community-run?
- Scope of "opening hours" data — can we source it, or crowd-source it too?
