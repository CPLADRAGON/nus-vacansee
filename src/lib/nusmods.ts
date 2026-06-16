import type { VenueEntry, TimetableSlot, VenueMatrix } from "@/types";
import { inferCluster, shouldSkipVenue } from "./cluster-rules";
import { classifyRoom } from "./room-classify";
import {
  buildCalendar,
  computeAcademicYearStart,
  type CalendarMap,
} from "./calendar";

const API_BASE = "https://api.nusmods.com/v2";

// --- Raw NUSMods venueInformation.json shapes ------------------------------

type RawWeeks =
  | number[]
  | { start: string; end: string; weeks: number[] }
  | { start: string; end: string; weekInterval: number };

interface RawClass {
  classNo?: string;
  startTime?: string;
  endTime?: string;
  day?: string;
  weeks?: RawWeeks;
  moduleCode?: string;
  lessonType?: string;
  size?: number;
}

interface RawDayInfo {
  day?: string;
  classes?: RawClass[];
}

type RawVenueInfo = Record<string, RawDayInfo[]>;

const DAYS = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

function weekNumberFromDate(dateISO: string, semStartISO: string): number {
  const d = new Date(dateISO).getTime();
  const s = new Date(semStartISO).getTime();
  return Math.max(1, Math.floor((d - s) / (7 * 86400000)) + 1);
}

// Flatten NUSMods' three `weeks` encodings into absolute week numbers.
function normalizeWeeks(weeks: RawWeeks | undefined, semStartISO: string): number[] {
  if (!weeks) return [];
  if (Array.isArray(weeks)) {
    return [...new Set(weeks.filter((w) => typeof w === "number"))].sort(
      (a, b) => a - b
    );
  }
  if ("weeks" in weeks && Array.isArray(weeks.weeks)) {
    return [...new Set(weeks.weeks.filter((w) => typeof w === "number"))].sort(
      (a, b) => a - b
    );
  }
  if ("weekInterval" in weeks && weeks.start && weeks.end) {
    const interval = Math.max(1, weeks.weekInterval || 1);
    const out: number[] = [];
    let cursor = new Date(weeks.start).getTime();
    const end = new Date(weeks.end).getTime();
    const step = interval * 7 * 86400000;
    while (cursor <= end) {
      out.push(
        weekNumberFromDate(new Date(cursor).toISOString().slice(0, 10), semStartISO)
      );
      cursor += step;
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }
  return [];
}

interface VenueMeta {
  lessonTypes: string[];
  maxSize: number;
}

function normalizeSemester(
  raw: RawVenueInfo,
  semester: number,
  semStartISO: string,
  out: Record<string, VenueEntry>,
  meta: Record<string, VenueMeta>
): void {
  for (const [venue, dayInfos] of Object.entries(raw)) {
    if (shouldSkipVenue(venue)) continue;
    if (!Array.isArray(dayInfos)) continue;

    for (const dayInfo of dayInfos) {
      const day = (dayInfo?.day || "").trim();
      if (!DAYS.has(day)) continue;

      for (const cls of dayInfo.classes || []) {
        const start = (cls.startTime || "").trim();
        const end = (cls.endTime || "").trim();
        const moduleCode = (cls.moduleCode || "").trim();
        const weeks = normalizeWeeks(cls.weeks, semStartISO);
        if (!start || !end || !moduleCode || weeks.length === 0) continue;

        const slot: TimetableSlot = {
          start,
          end,
          module: moduleCode,
          semester,
          weeks,
        };

        let entry = out[venue];
        if (!entry) {
          entry = { cluster: inferCluster(venue) };
          out[venue] = entry;
        }
        const arr = (entry as unknown as Record<string, TimetableSlot[]>)[day];
        if (arr) arr.push(slot);
        else (entry as unknown as Record<string, TimetableSlot[]>)[day] = [slot];

        // Accumulate room metadata for type/capacity inference.
        let m = meta[venue];
        if (!m) {
          m = { lessonTypes: [], maxSize: 0 };
          meta[venue] = m;
        }
        if (cls.lessonType) m.lessonTypes.push(cls.lessonType);
        if (typeof cls.size === "number" && cls.size > m.maxSize) {
          m.maxSize = cls.size;
        }
      }
    }
  }
}

async function fetchSemester(
  acadYear: string,
  semester: number
): Promise<RawVenueInfo> {
  const url = `${API_BASE}/${acadYear}/semesters/${semester}/venueInformation.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`NUSMods HTTP ${res.status} (sem ${semester})`);
  return (await res.json()) as RawVenueInfo;
}

// Fetch + normalize both semesters into the app's VenueMatrix shape.
export async function fetchVenueData(
  today: Date = new Date()
): Promise<VenueMatrix> {
  const acadStart = computeAcademicYearStart(today);
  const acadYear = `${acadStart}-${acadStart + 1}`;
  const calendar: CalendarMap = buildCalendar(acadStart);
  const sems = calendar[acadYear];

  const [raw1, raw2] = await Promise.all([
    fetchSemester(acadYear, 1).catch(() => ({}) as RawVenueInfo),
    fetchSemester(acadYear, 2).catch(() => ({}) as RawVenueInfo),
  ]);

  if (
    Object.keys(raw1).length === 0 &&
    Object.keys(raw2).length === 0
  ) {
    throw new Error("NUSMods returned no venue data");
  }

  const venues: Record<string, VenueEntry> = {};
  const meta: Record<string, VenueMeta> = {};
  normalizeSemester(raw1, 1, sems["1"].start, venues, meta);
  normalizeSemester(raw2, 2, sems["2"].start, venues, meta);

  // Sort each day's slots by start time for deterministic display.
  for (const entry of Object.values(venues)) {
    for (const [k, v] of Object.entries(entry)) {
      if (Array.isArray(v)) {
        (v as TimetableSlot[]).sort((a, b) => a.start.localeCompare(b.start));
      }
      void k;
    }
  }

  // Apply inferred room type + approximate capacity.
  for (const [code, entry] of Object.entries(venues)) {
    const m = meta[code];
    if (!m) continue;
    if (m.maxSize > 0) entry.capacity = m.maxSize;
    entry.type = classifyRoom(code, m.lessonTypes, m.maxSize);
  }

  const matrix: VenueMatrix = {
    _meta: {
      generated_at: new Date().toISOString(),
      academic_year: acadYear,
      venue_count: Object.keys(venues).length,
      module_count: 0,
    },
    _calendar: calendar,
  };
  Object.assign(matrix, venues);
  return matrix;
}
