import type { CalendarEntry } from "@/types";

export function getCurrentSemester(
  calendar: Record<string, Record<string, { start: string; end: string }>>
): CalendarEntry | null {
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
