"use client";

import { useMemo, useState, useEffect } from "react";
import type { VenueEntry, TimetableSlot, CalendarEntry } from "@/types";
import { formatTime } from "@/lib/occupancy-engine";
import { getCurrentWeek } from "@/lib/calendar";

interface Props {
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const HOUR_W = 52; // px per hour in the scrollable time track
const DAY_COL = 44; // px width of the sticky day-label column
const LANE_H = 22; // px per stacked lane within a day row

interface LaneItem {
  slot: TimetableSlot;
  lane: number;
}
interface DayLayout {
  items: LaneItem[];
  lanes: number;
}

function toMin(hhmm: string): number {
  return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(2), 10);
}

// Dedupe identical slots, then assign overlapping classes to separate lanes so
// concurrent bookings stack vertically instead of overlapping on top of each other.
function packLanes(slots: TimetableSlot[]): DayLayout {
  const seen = new Set<string>();
  const unique: TimetableSlot[] = [];
  for (const s of slots) {
    const key = `${s.start}|${s.end}|${s.module}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  unique.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  const laneEnds: string[] = [];
  const items: LaneItem[] = [];
  for (const s of unique) {
    let lane = laneEnds.findIndex((end) => end <= s.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(s.end);
    } else {
      laneEnds[lane] = s.end;
    }
    items.push({ slot: s, lane });
  }
  return { items, lanes: Math.max(1, laneEnds.length) };
}

// Compact a sorted week-number list into ranges, e.g. [3,4,5,7] -> "3–5, 7".
function formatWeeks(weeks: number[]): string {
  if (weeks.length === 0) return "";
  const sorted = [...weeks].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    if (i < sorted.length) {
      start = sorted[i];
      prev = sorted[i];
    }
  }
  return parts.join(", ");
}

export default function WeekGrid({ entry, now, semester }: Props) {
  const currentWeek = semester ? getCurrentWeek(semester.start) : null;
  const todayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

  // Which semesters does this venue actually have classes in?
  const availableSems = useMemo(() => {
    const set = new Set<number>();
    for (const day of [...DAYS, "Sunday"]) {
      const slots = (entry as unknown as Record<string, TimetableSlot[] | undefined>)[day];
      if (slots) for (const s of slots) set.add(s.semester);
    }
    return [...set].sort((a, b) => a - b);
  }, [entry]);

  // Semester currently shown. Default to the active semester, else the first
  // one this venue has data for. Reset the user's choice when the venue changes.
  const [override, setOverride] = useState<number | null>(null);
  useEffect(() => setOverride(null), [entry]);
  const viewSem = override ?? semester?.semester ?? availableSems[0] ?? 1;
  const isCurrentView = semester?.semester === viewSem;

  // Active slots for the shown semester, packed into lanes. This never mixes
  // semesters. The teaching-week filter only applies when we're actually in the
  // shown semester; otherwise the full semester schedule is displayed.
  const byDay = useMemo(() => {
    const map: Record<string, DayLayout> = {};
    for (const day of [...DAYS, "Sunday"]) {
      const slots = (entry as unknown as Record<string, TimetableSlot[] | undefined>)[day];
      if (!slots) continue;
      const active = slots.filter((s) => {
        if (s.semester !== viewSem) return false;
        if (isCurrentView && currentWeek) return s.weeks.includes(currentWeek);
        return true;
      });
      if (active.length) map[day] = packLanes(active);
    }
    return map;
  }, [entry, viewSem, isCurrentView, currentWeek]);

  // Time window: default 08:00–22:00, expanded to fit any out-of-range class.
  const { winStart, winEnd, hours } = useMemo(() => {
    let lo = 8 * 60;
    let hi = 22 * 60;
    for (const layout of Object.values(byDay)) {
      for (const { slot } of layout.items) {
        lo = Math.min(lo, Math.floor(toMin(slot.start) / 60) * 60);
        hi = Math.max(hi, Math.ceil(toMin(slot.end) / 60) * 60);
      }
    }
    const hrs: number[] = [];
    for (let h = lo; h <= hi; h += 60) hrs.push(h);
    return { winStart: lo, winEnd: hi, hours: hrs };
  }, [byDay]);

  const span = winEnd - winStart;
  const trackWidth = hours.length > 1 ? (hours.length - 1) * HOUR_W : HOUR_W;
  const pct = (min: number) => ((min - winStart) / span) * 100;

  const rows = byDay["Sunday"] ? [...DAYS, "Sunday"] : DAYS;

  const [selected, setSelected] = useState<{
    day: string;
    slot: TimetableSlot;
  } | null>(null);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMin >= winStart && nowMin <= winEnd;
  const nowLabel = now.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        {availableSems.length > 1 ? (
          <div className="inline-flex rounded-full border border-zinc-200 bg-white/60 p-0.5 text-[11px] font-medium">
            {availableSems.map((s) => (
              <button
                key={s}
                onClick={() => setOverride(s)}
                className={`rounded-full px-2.5 py-0.5 transition-colors ${
                  viewSem === s
                    ? "bg-nus-blue text-white"
                    : "text-zinc-500 hover:text-nus-blue"
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] font-medium text-zinc-500">
            Semester {viewSem}
          </span>
        )}
        {isCurrentView ? (
          <span className="rounded-full bg-nus-blue/10 px-2 py-0.5 text-[10px] font-medium text-nus-blue">
            Week {currentWeek}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-400">Full semester</span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200/70 bg-white/40">
        <div style={{ minWidth: DAY_COL + trackWidth }}>
          {/* Hour header */}
          <div className="flex border-b border-zinc-200/70">
            <div
              className="sticky left-0 z-20 shrink-0 bg-white/80 backdrop-blur"
              style={{ width: DAY_COL }}
            />
            <div className="relative h-6" style={{ width: trackWidth }}>
              {hours.map((h, i) => (
                <span
                  key={h}
                  className="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-zinc-400"
                  style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                >
                  {String(h / 60).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>

          {/* Day rows */}
          {rows.map((day) => {
            const layout = byDay[day];
            const lanes = layout?.lanes ?? 1;
            const rowH = Math.max(44, lanes * LANE_H + 8);
            const isToday = day === todayName;
            return (
              <div
                key={day}
                className={`flex border-b border-zinc-100 last:border-b-0 ${
                  isToday ? "bg-nus-orange/5" : ""
                }`}
              >
                <div
                  className={`sticky left-0 z-20 flex shrink-0 items-center justify-center bg-white/80 px-1 text-xs font-medium backdrop-blur ${
                    isToday ? "text-nus-orange" : "text-zinc-500"
                  }`}
                  style={{ width: DAY_COL }}
                >
                  {DAY_SHORT[day]}
                </div>

                <div className="relative" style={{ width: trackWidth, height: rowH }}>
                  {/* Dim past hours on today */}
                  {isToday && showNow && (
                    <span
                      className="absolute inset-y-0 left-0 bg-zinc-900/[0.04]"
                      style={{ width: `${pct(nowMin)}%` }}
                    />
                  )}

                  {/* Hour gridlines */}
                  {hours.slice(1, -1).map((h, i) => (
                    <span
                      key={h}
                      className="absolute inset-y-0 w-px bg-zinc-100"
                      style={{ left: `${((i + 1) / (hours.length - 1)) * 100}%` }}
                    />
                  ))}

                  {/* Free-all-day label */}
                  {!layout && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                      Free
                    </span>
                  )}

                  {/* Occupied blocks (lane-packed) */}
                  {layout?.items.map(({ slot: s, lane }, i) => {
                    const left = pct(toMin(s.start));
                    const width = pct(toMin(s.end)) - left;
                    const isSel =
                      selected?.day === day && selected?.slot === s;
                    return (
                      <button
                        key={`${s.start}-${s.module}-${i}`}
                        onClick={() => setSelected({ day, slot: s })}
                        title={`${s.module} · ${formatTime(s.start)}–${formatTime(s.end)}`}
                        aria-label={`${s.module} from ${formatTime(s.start)} to ${formatTime(s.end)} on ${day}`}
                        className={`absolute overflow-hidden rounded px-1 text-left font-mono text-[10px] leading-tight text-white transition-shadow ${
                          isSel
                            ? "z-10 bg-nus-blue ring-2 ring-nus-orange"
                            : "bg-nus-blue/90 hover:bg-nus-blue"
                        }`}
                        style={{
                          left: `${left}%`,
                          width: `calc(${width}% - 2px)`,
                          top: `calc(${(lane / lanes) * 100}% + 3px)`,
                          height: `calc(${100 / lanes}% - 6px)`,
                        }}
                      >
                        <span className="block truncate">{s.module}</span>
                      </button>
                    );
                  })}

                  {/* Now line */}
                  {isToday && showNow && (
                    <span
                      className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-nus-orange"
                      style={{ left: `${pct(nowMin)}%` }}
                    >
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-nus-orange px-1 py-0.5 text-[8px] font-semibold leading-none text-white shadow-sm">
                        {nowLabel}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected block detail */}
      {selected && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-nus-blue/5 px-3 py-2 text-xs">
          <span className="font-mono font-semibold text-nus-blue">
            {selected.slot.module}
          </span>
          <span className="text-zinc-500">
            {DAY_SHORT[selected.day]} · {formatTime(selected.slot.start)}–
            {formatTime(selected.slot.end)}
          </span>
          {selected.slot.weeks.length > 0 && (
            <span className="ml-auto text-zinc-400">
              Weeks {formatWeeks(selected.slot.weeks)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
