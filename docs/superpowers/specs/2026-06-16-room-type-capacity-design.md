# Design — Room Type & Approximate Capacity

**Date:** 2026-06-16
**Status:** Approved (pending implementation)

## Goal

Optimize the core "I need a spot to study/work **right now**" flow by helping
students judge whether a free room actually suits them. Add two static room
attributes — **room type** and an **approximate capacity** — surfaced on room
cards and the venue detail, plus a **room-type filter**.

## Background / Constraints

- Data comes from NUSMods `venueInformation.json`, fetched and normalized
  client-side (`src/lib/nusmods.ts`).
- The feed does **not** expose true seating capacity. Each class carries a
  `size` (enrolment) and a `lessonType`. We therefore derive an **approximate
  capacity** = the largest class `size` ever held in that room, always shown
  with a `~` prefix to signal it is an estimate, not official seating.
- Room type is **not** a field in the feed; it is inferred (see below).
- Room type and capacity are **static** room attributes (independent of teaching
  week or semester), so they display even between semesters.

## Inference Strategy (Hybrid)

New module `src/lib/room-classify.ts`.

```
type RoomType =
  | "Lecture Theatre"
  | "Seminar Room"
  | "Tutorial Room"
  | "Lab"
  | "Classroom";

classifyRoom(venue: string, lessonTypes: string[], capacity: number): RoomType
```

Order of precedence:

1. **Unambiguous venue-code rules (highest confidence):**
   - starts with `LT` → Lecture Theatre
   - name contains `LAB` (e.g. `_LAB`, `-LAB`) → Lab
   - starts with `SR` or contains `SEMINAR` → Seminar Room
   - starts with `TR` or contains `TUT` → Tutorial Room
2. **Dominant `lessonType` fallback** (most frequent lesson type held in room):
   - `Laboratory` → Lab
   - `Tutorial` / `Recitation` → Tutorial Room
   - `Seminar-Style Module Class` → Seminar Room
   - `Lecture` / `Sectional Teaching` with `capacity >= 100` → Lecture Theatre
3. **Default** → Classroom.

`capacity` = max class `size` across all classes in the venue (0/undefined if
unknown).

## Components & Changes

### Data layer — `src/lib/nusmods.ts`
- Extend the raw class type usage to read `lessonType` and `size` (already
  present in the feed; currently ignored).
- While normalizing each venue, accumulate `maxSize` and a tally of
  `lessonType`s.
- After building the venue's slots, set `entry.capacity = maxSize` (when > 0)
  and `entry.type = classifyRoom(venue, lessonTypes, maxSize)`.

### Types — `src/types/index.ts`
- Extend `VenueEntry`:
  ```
  interface VenueEntry {
    cluster: string;
    capacity?: number;
    type?: RoomType;
    Monday?: TimetableSlot[];
    ... // other days
  }
  ```
- Export `RoomType` (from `room-classify.ts`, re-exported via types if convenient).

### UI

- **`RoomCard.tsx`:** add a subtle type chip (e.g. "Lecture Theatre") and
  `~120 seats` text near the existing cluster tag. Omit gracefully when the
  field is absent.
- **`VenueDetail.tsx`:** show type + `~capacity` in the modal header beside the
  cluster.
- **`LocationPrompt.tsx`:** add a second, horizontally-scrollable **room-type
  filter** pill row (All / Lecture Theatre / Tutorial / Lab / Seminar /
  Classroom), visually distinct from the cluster pills. New props
  `activeType: RoomType | null` and `onTypeSelect`.
- **`page.tsx`:** add `type` filter state; apply it as an additional constraint
  in **both** the near-me ranking list and the browse (cluster/search) list.

## Edge Cases

- **Offline fallback snapshot** (`public/venues_timetable.json`, old Python
  format) has no `capacity`/`type`. Fields are `undefined`: cards omit badges,
  and a specific type filter simply won't match those rooms ("All" still shows
  everything). The normal live path always populates them.
- **Capacity unknown** (no `size` on any class): omit the `~seats` text; still
  classify type via code rules / lessonType.
- **Between semesters:** type/capacity computed from all classes regardless of
  week — still shown.
- Venues only ever appear with ≥1 class (enforced by existing normalization), so
  there is always at least one `lessonType`/`size` sample.

## Out of Scope (YAGNI for this round)

- "Seats ≥ N" numeric size filter (display capacity only; type filter only).
- Favorites/recents, walking directions, duration chips — separate future work.
- Regenerating the offline snapshot to include type/capacity.

## Validation

- `npm run build` passes.
- Verify (via server-rendered HTML inspection, since headless browsers are
  blocked in this environment, or manual browser check) that:
  - representative rooms classify sensibly (`LT17` → Lecture Theatre,
    a `*_LAB*` venue → Lab, a `COM1` tutorial room → Tutorial/Classroom),
  - capacity shows the max class size with `~`,
  - the type filter narrows both near-me and browse lists,
  - cards/detail degrade gracefully when fields are absent.
