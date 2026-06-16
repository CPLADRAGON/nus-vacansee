import type { CalendarEntry } from "@/types";

// NUS academic years start in August. If month >= Aug we are in the "start"
// calendar year; otherwise we are in the "end" calendar year.
const ACADEMIC_YEAR_START_MONTH = 8; // August (1-indexed)
const SEMESTER_WEEKS = 17;

export type CalendarMap = Record<
  string,
  Record<string, { start: string; end: string }>
>;

export function computeAcademicYearStart(today: Date = new Date()): number {
  // getMonth() is 0-indexed, so August === 7.
  if (today.getMonth() + 1 >= ACADEMIC_YEAR_START_MONTH) return today.getFullYear();
  return today.getFullYear() - 1;
}

export function getAcademicYearString(today: Date = new Date()): string {
  const start = computeAcademicYearStart(today);
  return `${start}-${start + 1}`;
}

function nthWeekdayOfMonth(
  year: number,
  month: number, // 1-indexed
  weekday: number, // 0=Sun .. 6=Sat
  n: number
): Date {
  const first = new Date(year, month - 1, 1);
  const daysUntil = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + daysUntil + 7 * (n - 1));
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Sem 1 starts on the 2nd Monday of August; Sem 2 on the 2nd Monday of January.
// Each semester lasts 17 weeks by convention.
export function buildCalendar(acadYearStart: number): CalendarMap {
  const endYear = acadYearStart + 1;
  const s1 = nthWeekdayOfMonth(acadYearStart, 8, 1, 2); // 2nd Monday of Aug
  const s2 = nthWeekdayOfMonth(endYear, 1, 1, 2); // 2nd Monday of Jan

  const addWeeks = (d: Date, w: number) => {
    const out = new Date(d);
    out.setDate(out.getDate() + w * 7 - 1);
    return out;
  };

  const acadYear = `${acadYearStart}-${endYear}`;
  return {
    [acadYear]: {
      "1": { start: toISODate(s1), end: toISODate(addWeeks(s1, SEMESTER_WEEKS)) },
      "2": { start: toISODate(s2), end: toISODate(addWeeks(s2, SEMESTER_WEEKS)) },
    },
  };
}

export function getCurrentSemester(calendar: CalendarMap): CalendarEntry | null {
  const now = new Date();
  for (const [year, sems] of Object.entries(calendar)) {
    for (const [sem, range] of Object.entries(sems)) {
      const start = new Date(range.start);
      const end = new Date(range.end);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        return {
          semester: Number(sem),
          start: range.start,
          end: range.end,
          academicYear: year,
        };
      }
    }
  }
  return null;
}

export function getCurrentWeek(semesterStart: string): number {
  const start = new Date(semesterStart);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return Math.max(1, week);
}
