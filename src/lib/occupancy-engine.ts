import type { VenueEntry, TimetableSlot, OccupancyInfo, CalendarEntry } from "@/types";
import { getCurrentWeek } from "./calendar";

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

export function getSingaporeTime(): Date {
  const now = new Date();
  const sg = now.toLocaleString("en-US", { timeZone: "Asia/Singapore" });
  return new Date(sg);
}

export function formatTime(hhmm: string): string {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = hhmm.slice(2);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${m} ${ampm}`;
}

function isCrunchHour(time: string): boolean {
  const t = parseInt(time, 10);
  return t >= 1200 && t <= 1400;
}

export function computeOccupancy(
  venue: VenueEntry,
  now: Date,
  semester: CalendarEntry | null
): OccupancyInfo {
  if (!semester) {
    return { status: "vacant" };
  }

  const dayName = DAY_NAMES[now.getDay()];
  const currentTime =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");
  const currentWeek = getCurrentWeek(semester.start);

  const slots = (venue as unknown as Record<string, TimetableSlot[] | undefined>)[dayName];
  if (!slots || slots.length === 0) {
    return { status: "vacant" };
  }

  const activeSlots = slots.filter((s) => s.weeks.includes(currentWeek));

  for (const slot of activeSlots) {
    if (currentTime >= slot.start && currentTime < slot.end) {
      const status = isCrunchHour(currentTime) ? "crunch" : "occupied";
      return {
        status,
        currentModule: slot.module,
        currentTitle: slot.title,
        currentType: slot.type,
        until: slot.end,
      };
    }
  }

  const nextClass = activeSlots.find((s) => s.start > currentTime);

  return {
    status: "vacant",
    nextClass: nextClass
      ? { start: nextClass.start, module: nextClass.module, title: nextClass.title }
      : undefined,
  };
}
